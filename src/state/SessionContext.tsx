import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatMessage,
  ChatSession,
  ConnectionStatus,
  EnterRoomResult,
  JoinRoomRequest,
  MessageStatus,
  P2PStatus,
  RelayInfo,
  RoomSnapshot,
  RoomUser
} from '../types';
import { createId, createUserId } from '../utils/ids';
import { getOldestChatTimestamp, mapPersistedMessage, mergeMessages } from '../utils/messages';
import { getSessionValue, removeSessionValue, setSessionValue } from '../utils/storage';
import { createRoom, getRoomDetails } from '../services/registryApi';
import { getRoomMessages } from '../services/relayApi';
import { RelaySocket } from '../services/relaySocket';
import { PeerConnectionManager, PeerSignalPayload } from '../services/p2p';
import { useSettings } from './SettingsContext';

const ACTIVE_SESSION_KEY = 'cyan-chat-active-session-v1';
const SESSION_MESSAGES_PREFIX = 'cyan-chat-session-messages-v1';
const HISTORY_PAGE_SIZE = 50;
const MAX_SESSION_MESSAGES = 300;

interface SessionContextValue {
  session: ChatSession | null;
  messages: ChatMessage[];
  members: RoomUser[];
  historyLoading: boolean;
  hasMoreHistory: boolean;
  createAndEnterRoom: (request: JoinRoomRequest) => Promise<EnterRoomResult>;
  joinAndEnterRoom: (request: JoinRoomRequest) => Promise<EnterRoomResult>;
  restoreSession: (roomId: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendMessage: (text: string) => void;
  retryConnection: () => void;
  loadOlderMessages: () => Promise<void>;
  setSelectedRoomId: (roomId: string) => void;
  selectedRoomId: string;
}

type InternalState = {
  connectionStatus: ConnectionStatus;
  p2pStatus: P2PStatus;
  room: RoomSnapshot | null;
  roomInfo: EnterRoomResult | null;
  error: string | null;
};

type CheckRelayResult = {
  roomId: string;
  relayChanged: boolean;
  offlineMessagesEnabled?: boolean;
  oldRelayId?: string;
  relay: RelayInfo;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function persistActiveSession(info: EnterRoomResult | null) {
  if (info) {
    setSessionValue(ACTIVE_SESSION_KEY, info);
  } else {
    removeSessionValue(ACTIVE_SESSION_KEY);
  }
}

function sessionMessagesKey(info: Pick<EnterRoomResult, 'roomId' | 'userId'>) {
  return `${SESSION_MESSAGES_PREFIX}:${encodeURIComponent(info.roomId)}:${encodeURIComponent(info.userId)}`;
}

function getStoredSessionMessages(info: Pick<EnterRoomResult, 'roomId' | 'userId'>) {
  return getSessionValue<ChatMessage[]>(sessionMessagesKey(info), []);
}

function persistSessionMessages(info: Pick<EnterRoomResult, 'roomId' | 'userId'>, nextMessages: ChatMessage[]) {
  const chatMessages = nextMessages
    .filter((message) => message.direction !== 'system')
    .slice(-MAX_SESSION_MESSAGES);
  setSessionValue(sessionMessagesKey(info), chatMessages);
}

function removePersistedSessionMessages(info: Pick<EnterRoomResult, 'roomId' | 'userId'>) {
  removeSessionValue(sessionMessagesKey(info));
}

function relayStatusToMessageStatus(status?: string): MessageStatus | null {
  if (status === 'read') return 'read';
  if (status === 'delivered') return 'delivered';
  if (status === 'sent' || status === 'pending') return 'sent';
  return null;
}

function deliveryStatusToMessageStatus(deliveryStatus?: Record<string, string>): MessageStatus | null {
  const statuses = Object.values(deliveryStatus || {});
  if (!statuses.length) return null;
  if (statuses.every((status) => status === 'read')) return 'read';
  if (statuses.some((status) => status === 'delivered' || status === 'read')) return 'delivered';
  if (statuses.some((status) => status === 'sent' || status === 'pending')) return 'sent';
  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomUser[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [state, setState] = useState<InternalState>({
    connectionStatus: 'idle',
    p2pStatus: 'disabled',
    room: null,
    roomInfo: null,
    error: null
  });

  const socketRef = useRef<RelaySocket | null>(null);
  const peerRef = useRef<PeerConnectionManager | null>(null);
  const sessionInfoRef = useRef<EnterRoomResult | null>(null);
  const membersRef = useRef<RoomUser[]>([]);
  const reconnectAttempts = useRef(0);
  const leaveRequested = useRef(false);
  const historyLoadingRef = useRef(false);
  const restoringRef = useRef(false);
  const persistentChatEnabledRef = useRef(settings.persistentChatEnabled);
  const reconnectTimerRef = useRef<number | null>(null);
  const lastSystemMessageRef = useRef<{ text: string; kind: 'info' | 'error'; ts: number } | null>(null);

  useEffect(() => {
    persistentChatEnabledRef.current = settings.persistentChatEnabled;
    if (!settings.persistentChatEnabled && sessionInfoRef.current) {
      removePersistedSessionMessages(sessionInfoRef.current);
    }
  }, [settings.persistentChatEnabled]);

  useEffect(() => {
    const info = sessionInfoRef.current;
    if (!settings.persistentChatEnabled || !info) return;
    persistSessionMessages(info, messages);
  }, [messages, settings.persistentChatEnabled]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const updateMembers = useCallback(
    (updater: RoomUser[] | ((current: RoomUser[]) => RoomUser[])) => {
      const updated = typeof updater === 'function' ? updater(membersRef.current) : updater;
      const unique = Array.from(new Map(updated.map((user) => [user.userId, user])).values());

      membersRef.current = unique;
      setMembers(unique);
      setState((prev) =>
        prev.room && prev.room.memberCount !== unique.length
          ? { ...prev, room: { ...prev.room, memberCount: unique.length } }
          : prev
      );
    },
    []
  );

  const session = useMemo<ChatSession | null>(() => {
    if (!state.roomInfo) return null;
    return {
      roomId: state.roomInfo.roomId,
      relay: state.roomInfo.relay,
      userId: state.roomInfo.userId,
      nickname: state.roomInfo.nickname,
      members,
      room: state.room,
      connectionStatus: state.connectionStatus,
      p2pStatus: state.p2pStatus,
      error: state.error,
      hasPin: state.roomInfo.hasPin,
      offlineMessagesEnabled: state.roomInfo.offlineMessagesEnabled ?? state.room?.offlineMessagesEnabled
    };
  }, [state, members]);

  useEffect(() => {
    return () => {
      disconnect(true);
    };
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => mergeMessages(prev, incoming));
  }, []);

  const fetchMessageHistory = useCallback(
    async (options: { before?: number; limit?: number; replace?: boolean } = {}) => {
      const info = sessionInfoRef.current;
      if (!info || historyLoadingRef.current) return;

      historyLoadingRef.current = true;
      setHistoryLoading(true);
      try {
        const response = await getRoomMessages(info.relay.publicUrl, info.roomId, {
          before: options.before,
          limit: options.limit ?? HISTORY_PAGE_SIZE
        });
        const mapped = response.messages.map((msg) => mapPersistedMessage(msg, info.roomId, info.userId));
        if (options.replace) {
          setMessages((prev) => {
            const systemMessages = prev.filter((m) => m.direction === 'system');
            return mergeMessages(systemMessages, mapped);
          });
        } else {
          appendMessages(mapped);
        }
        setHasMoreHistory(response.hasMore);
      } catch {
        if (options.before == null) {
          setHasMoreHistory(false);
        }
      } finally {
        historyLoadingRef.current = false;
        setHistoryLoading(false);
      }
    },
    [appendMessages]
  );

  const loadInitialHistory = useCallback(async () => {
    await fetchMessageHistory({ limit: HISTORY_PAGE_SIZE });
  }, [fetchMessageHistory]);

  const loadOlderMessages = useCallback(async () => {
    const oldest = getOldestChatTimestamp(messages);
    if (!hasMoreHistory || historyLoadingRef.current || oldest == null) return;
    await fetchMessageHistory({ before: oldest, limit: HISTORY_PAGE_SIZE });
  }, [fetchMessageHistory, hasMoreHistory, messages]);

  const resolveRelay = useCallback(
    async (roomId: string): Promise<RelayInfo | null> => {
      try {
        const details = await getRoomDetails(settings.registryUrl, roomId);
        return details.relay;
      } catch {
        return null;
      }
    },
    [settings.registryUrl]
  );

  const checkRelay = useCallback(
    async (roomId: string): Promise<CheckRelayResult | null> => {
      const base = settings.registryUrl.replace(/\/+$/, '');
      const url = `${base}/api/room/checkrelay/${encodeURIComponent(roomId)}`;

      try {
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return null;
        return (await res.json()) as CheckRelayResult;
      } catch {
        return null;
      }
    },
    [settings.registryUrl]
  );

  const markConnected = useCallback(() => {
    setState((prev) =>
      prev.connectionStatus === 'connected'
        ? prev
        : {
            ...prev,
            connectionStatus: 'connected',
            error: null
          }
    );
  }, []);

  const addSystemMessage = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    const now = Date.now();
    const last = lastSystemMessageRef.current;
    if (last && last.text === text && last.kind === kind && now - last.ts < 1200) {
      return;
    }
    lastSystemMessageRef.current = { text, kind, ts: now };

    setMessages((prev) => [
      ...prev,
      {
        id: createId('sys'),
        roomId: sessionInfoRef.current?.roomId || '',
        senderId: 'system',
        senderNickname: 'System',
        text,
        timestamp: Math.floor(now / 1000),
        direction: 'system',
        status: 'received',
        deliveryMode: 'system',
        colorKey: 'system',
        systemKind: kind
      }
    ]);
  }, []);

  const setupP2P = useCallback(
    async (roomInfo: EnterRoomResult, users: RoomUser[], room: RoomSnapshot, socket: RelaySocket) => {
      const remoteUsers = users.filter((user) => user.userId !== roomInfo.userId);
      if (remoteUsers.length === 1 && users.length === 2) {
        const remote = remoteUsers[0];
        const peer = new PeerConnectionManager(roomInfo.roomId, roomInfo.userId, {
          onStatusChange: (p2pStatus) => setState((prev) => ({ ...prev, p2pStatus })),
          onMessage: (message) => appendMessages([message]),
          onLocalLog: (text, kind = 'info') => addSystemMessage(text, kind),
          onSendSignal: (payload) => socket.sendSignal(remote.userId, payload as Record<string, unknown>)
        });
        peerRef.current = peer;
        peer.setRemoteUser(remote.userId);
        const shouldInitiate = await peer.shouldInitiate(remote.userId);
        setState((prev) => ({ ...prev, p2pStatus: 'negotiating' }));
        if (shouldInitiate) {
          await peer.start();
        }
      } else {
        peerRef.current?.close();
        peerRef.current = null;
        setState((prev) => ({ ...prev, p2pStatus: users.length === 2 ? 'negotiating' : 'disabled' }));
      }
    },
    [addSystemMessage, appendMessages]
  );

  const scheduleReconnect = useCallback(
    (socket: RelaySocket) => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      reconnectAttempts.current += 1;
      if (reconnectAttempts.current >= 6) {
        setState((prev) => ({
          ...prev,
          connectionStatus: 'offline',
          error: 'Unable to reconnect.',
          p2pStatus: 'unavailable'
        }));
        return;
      }

      const delay = Math.min(5000, 600 * reconnectAttempts.current);
      reconnectTimerRef.current = window.setTimeout(async () => {
        if (leaveRequested.current || !sessionInfoRef.current) return;

        const info = sessionInfoRef.current;
        const checked = await checkRelay(info.roomId);

        if (checked?.relay) {
          const relay = checked.relay;
          const offlineMessagesEnabled =
            typeof checked.offlineMessagesEnabled === 'boolean'
              ? checked.offlineMessagesEnabled
              : info.offlineMessagesEnabled;
          if (relay.publicUrl !== info.relay.publicUrl) {
            info.relay = relay;
            info.offlineMessagesEnabled = offlineMessagesEnabled;
            sessionInfoRef.current = info;
            persistActiveSession(info);
            socket.updateUrl(relay.publicUrl);
            addSystemMessage('Room moved to a new relay. Reconnecting…');
          } else {
            info.relay = relay;
            info.offlineMessagesEnabled = offlineMessagesEnabled;
            sessionInfoRef.current = info;
            persistActiveSession(info);
          }
        } else {
          const relay = await resolveRelay(info.roomId);
          if (relay && relay.publicUrl !== info.relay.publicUrl) {
            info.relay = relay;
            sessionInfoRef.current = info;
            persistActiveSession(info);
            socket.updateUrl(relay.publicUrl);
            addSystemMessage('Room moved to a new relay. Reconnecting…');
          }
        }

        socket.connect();
      }, delay);
    },
    [addSystemMessage, checkRelay, resolveRelay]
  );

  const connect = useCallback(
    (roomInfo: EnterRoomResult, roomDetails?: RoomSnapshot | null) => {
      const previousRoomId = sessionInfoRef.current?.roomId;
      leaveRequested.current = false;
      clearReconnectTimer();

      try {
        socketRef.current?.close();
      } catch {
        // ignore
      }
      socketRef.current = null;

      try {
        peerRef.current?.close();
      } catch {
        // ignore
      }
      peerRef.current = null;

      reconnectAttempts.current = 0;
      const storedMessages = persistentChatEnabledRef.current ? getStoredSessionMessages(roomInfo) : [];

      sessionInfoRef.current = roomInfo;
      persistActiveSession(roomInfo);

      if (previousRoomId && previousRoomId !== roomInfo.roomId) {
        setMessages(storedMessages);
        setHasMoreHistory(false);
      } else if (storedMessages.length) {
        setMessages((prev) => mergeMessages(prev, storedMessages));
      }

      setSelectedRoomId(roomInfo.roomId);
      setState((prev) => ({
        ...prev,
        connectionStatus: 'connecting',
        p2pStatus: 'disabled',
        roomInfo,
        room: roomDetails || prev.room,
        error: null
      }));

      const socket = new RelaySocket({
        url: roomInfo.relay.publicUrl,
        onConnectionStateChange: (connected) => {
          if (!connected && !leaveRequested.current) {
            setState((prev) => ({
              ...prev,
              connectionStatus: prev.connectionStatus === 'connected' ? 'reconnecting' : prev.connectionStatus
            }));
          }
        },
        onEvent: async (event) => {
          if (event.type === 'open') {
            socket.joinRoom({
              roomId: roomInfo.roomId,
              userId: roomInfo.userId,
              nickname: roomInfo.nickname,
              pin: roomInfo.pin,
              transport: 'relay',
              peerInfo: {}
            });
            return;
          }

          if (event.type === 'room_joined') {
            reconnectAttempts.current = 0;
            markConnected();
            const joinedUsers = event.users || [];
            const offlineMessagesEnabled =
              event.room.offlineMessagesEnabled ?? event.offlineMessagesEnabled ?? roomInfo.offlineMessagesEnabled;
            const joinedRoom = {
              ...event.room,
              memberCount: joinedUsers.length,
              offlineMessagesEnabled
            };
            const joinedRoomInfo = {
              ...roomInfo,
              offlineMessagesEnabled
            };
            sessionInfoRef.current = joinedRoomInfo;
            persistActiveSession(joinedRoomInfo);
            setState((prev) => ({
              ...prev,
              roomInfo: joinedRoomInfo,
              room: joinedRoom,
              error: null
            }));
            updateMembers(joinedUsers);

            await loadInitialHistory();

            setMessages((prev) => {
              const hasChatMessages = prev.some((m) => m.direction !== 'system');
              if (hasChatMessages) return prev;
              return [
                ...prev,
                {
                  id: createId('sys'),
                  roomId: roomInfo.roomId,
                  senderId: 'system',
                  senderNickname: 'System',
                  text: 'You joined the room.',
                  timestamp: Math.floor(Date.now() / 1000),
                  direction: 'system',
                  status: 'received',
                  deliveryMode: 'system',
                  colorKey: 'system',
                  systemKind: 'info'
                }
              ];
            });

            await setupP2P(joinedRoomInfo, joinedUsers, joinedRoom, socket);
            return;
          }

          if (event.type === 'user_joined') {
            markConnected();
            updateMembers((prev) => {
              const next = prev.filter((u) => u.userId !== event.userId);
              return [
                ...next,
                {
                  userId: event.userId,
                  nickname: event.nickname,
                  transport: event.transport,
                  peerInfo: event.peerInfo,
                  connected: true
                }
              ];
            });
            addSystemMessage(`${event.nickname || event.userId} joined the room.`);
            return;
          }

          if (event.type === 'user_left') {
            markConnected();
            updateMembers((prev) => prev.filter((u) => u.userId !== event.userId));
            addSystemMessage(`${event.userId} left the room.`);
            setState((prev) => ({ ...prev, p2pStatus: 'unavailable' }));
            peerRef.current?.close();
            peerRef.current = null;
            return;
          }

          if (event.type === 'message') {
            markConnected();
            const isOwnMessage = event.senderId === roomInfo.userId;
            const senderNickname =
              isOwnMessage
                ? roomInfo.nickname
                : membersRef.current.find((u) => u.userId === event.senderId)?.nickname || event.senderId;
            const incoming: ChatMessage = {
              id: event.messageId || createId('msg'),
              roomId: event.roomId,
              senderId: event.senderId,
              senderNickname,
              text: event.text,
              timestamp: event.createdAt || Math.floor(Date.now() / 1000),
              direction: isOwnMessage ? 'outgoing' : 'incoming',
              status: isOwnMessage ? relayStatusToMessageStatus(event.status) || 'sent' : 'received',
              deliveryMode: peerRef.current ? 'p2p' : 'relay',
              colorKey: event.senderId
            };
            appendMessages([incoming]);
            if (!peerRef.current && !isOwnMessage) socket.sendAck(event.messageId, 'delivered');
            return;
          }

          if (event.type === 'message_accepted') {
            markConnected();
            if (event.ok) {
              const status = deliveryStatusToMessageStatus(event.deliveryStatus) || 'sent';
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === event.messageId
                    ? {
                        ...m,
                        status,
                        timestamp: event.createdAt || m.timestamp
                      }
                    : m
                )
              );
            }
            return;
          }

          if (event.type === 'message_status') {
            markConnected();
            const status = relayStatusToMessageStatus(event.status);
            if (status) {
              setMessages((prev) =>
                prev.map((m) => (m.id === event.messageId && m.direction === 'outgoing' ? { ...m, status } : m))
              );
            }
            return;
          }

          if (event.type === 'ack_accepted') {
            markConnected();
            return;
          }

          if (event.type === 'signal') {
            markConnected();
            if (!peerRef.current) {
              const remoteUserId = event.senderId;
              const peer = new PeerConnectionManager(roomInfo.roomId, roomInfo.userId, {
                onStatusChange: (p2pStatus) => setState((prev) => ({ ...prev, p2pStatus })),
                onMessage: (message) => appendMessages([message]),
                onLocalLog: (text, kind = 'info') => addSystemMessage(text, kind),
                onSendSignal: (payload) => socket.sendSignal(remoteUserId, payload as Record<string, unknown>)
              });
              peerRef.current = peer;
              peer.setRemoteUser(remoteUserId);
              await peer.shouldInitiate(remoteUserId);
              setState((prev) => ({ ...prev, p2pStatus: 'negotiating' }));
            }
            await peerRef.current?.handleSignal(event.payload as PeerSignalPayload);
            return;
          }

          if (event.type === 'pong') {
            markConnected();
            return;
          }

          if (event.type === 'error') {
            if (event.error === 'connection_error' || event.error === 'invalid_message') {
              return;
            }

            let friendly = 'Something went wrong.';
            if (event.error === 'room_not_found') friendly = 'Room not found.';
            if (event.error === 'room_full') friendly = 'This room is full.';
            if (event.error === 'pin_required') friendly = 'A PIN is required for this room.';
            if (event.error === 'pin_invalid') friendly = 'The PIN is invalid.';
            if (
              event.error === 'user_id_required' ||
              event.error === 'room_id_required' ||
              event.error === 'room_id_and_user_id_required'
            ) {
              friendly = 'The room could not be joined.';
            }
            setState((prev) => ({
              ...prev,
              error: friendly,
              connectionStatus: prev.connectionStatus === 'connected' ? 'reconnecting' : 'error',
              p2pStatus: 'unavailable'
            }));
            addSystemMessage(friendly, 'error');
            return;
          }

          if (event.type === 'close' && !leaveRequested.current) {
            setState((prev) => ({
              ...prev,
              connectionStatus: prev.connectionStatus === 'connected' ? 'reconnecting' : prev.connectionStatus,
              error: 'Connection lost. Reconnecting…'
            }));
            scheduleReconnect(socket);
          }
        }
      });

      socketRef.current = socket;
      socket.connect();
    },
    [addSystemMessage, appendMessages, clearReconnectTimer, loadInitialHistory, markConnected, scheduleReconnect, setupP2P, updateMembers]
  );

  const disconnect = useCallback(
    (silent = false) => {
      leaveRequested.current = true;
      clearReconnectTimer();

      try {
        socketRef.current?.leaveRoom();
      } catch {
        // ignore
      }

      socketRef.current?.close();
      socketRef.current = null;

      peerRef.current?.close();
      peerRef.current = null;

      if (!silent) {
        sessionInfoRef.current = null;
        persistActiveSession(null);
        setMessages([]);
        updateMembers([]);
        setHasMoreHistory(false);
        setState({
          connectionStatus: 'idle',
          p2pStatus: 'disabled',
          room: null,
          roomInfo: null,
          error: null
        });
      }
    },
    [clearReconnectTimer, updateMembers]
  );

  const createAndEnterRoom = useCallback(
    async (request: JoinRoomRequest): Promise<EnterRoomResult> => {
      const nickname = request.nickname.trim() || settings.nickname.trim() || 'Guest';
      const roomId = request.roomId?.trim() || createId('room').slice(-6).toUpperCase();
      const created = await createRoom(settings.registryUrl, {
        roomId,
        pin: request.pin?.trim() || undefined,
        maxUsers: request.maxUsers || 2,
        offlineMessagesEnabled: !!request.offlineMessagesEnabled
      });

      const relay: RelayInfo = {
        relayId: created.relayId,
        relayName: 'Assigned Relay',
        publicUrl: created.publicUrl,
        region: 'other',
        isOnline: true
      };

      const result: EnterRoomResult = {
        roomId: created.roomId,
        relay,
        userId: createUserId(nickname),
        nickname,
        hasPin: !!request.pin?.trim(),
        pin: request.pin?.trim() || undefined,
        maxUsers: request.maxUsers || 2,
        offlineMessagesEnabled: created.offlineMessagesEnabled ?? !!request.offlineMessagesEnabled,
        mode: 'create'
      };

      sessionInfoRef.current = result;
      setMessages([]);
      setHasMoreHistory(false);
      setState((prev) => ({
        ...prev,
        roomInfo: result,
        connectionStatus: 'preparing',
        error: null,
        p2pStatus: 'disabled'
      }));
      setSelectedRoomId(result.roomId);
      connect(result);
      return result;
    },
    [connect, settings.nickname, settings.registryUrl]
  );

  const joinAndEnterRoom = useCallback(
    async (request: JoinRoomRequest): Promise<EnterRoomResult> => {
      const nickname = request.nickname.trim() || settings.nickname.trim() || 'Guest';
      const roomId = request.roomId?.trim() || '';
      if (!roomId) throw new Error('Room ID is required.');

      const details = await getRoomDetails(settings.registryUrl, roomId);
      const relay = details.relay;
      const result: EnterRoomResult = {
        roomId,
        relay,
        userId: createUserId(nickname),
        nickname,
        hasPin: !!details.room.hasPin,
        pin: request.pin?.trim() || undefined,
        maxUsers: details.room.maxUsers,
        offlineMessagesEnabled: !!details.room.offlineMessagesEnabled,
        mode: 'join'
      };

      sessionInfoRef.current = result;
      setMessages([]);
      setHasMoreHistory(false);
      setState((prev) => ({
        ...prev,
        roomInfo: result,
        connectionStatus: 'preparing',
        error: null,
        p2pStatus: 'disabled'
      }));
      setSelectedRoomId(result.roomId);
      connect(result);
      return result;
    },
    [connect, settings.nickname, settings.registryUrl]
  );

  const restoreSession = useCallback(
    async (roomId: string): Promise<boolean> => {
      if (restoringRef.current || sessionInfoRef.current?.roomId === roomId) return false;
      restoringRef.current = true;
      try {
        const stored = getSessionValue<EnterRoomResult | null>(ACTIVE_SESSION_KEY, null);
        if (!stored || stored.roomId !== roomId) return false;

        const checked = await checkRelay(roomId);
        const relay = checked?.relay || (await resolveRelay(roomId));
        const roomInfo: EnterRoomResult = relay ? { ...stored, relay } : stored;
        if (typeof checked?.offlineMessagesEnabled === 'boolean') {
          roomInfo.offlineMessagesEnabled = checked.offlineMessagesEnabled;
        }

        sessionInfoRef.current = roomInfo;
        setMessages([]);
        setHasMoreHistory(false);
        setState((prev) => ({
          ...prev,
          roomInfo,
          connectionStatus: 'preparing',
          error: null,
          p2pStatus: 'disabled'
        }));
        setSelectedRoomId(roomInfo.roomId);
        connect(roomInfo);
        return true;
      } catch {
        return false;
      } finally {
        restoringRef.current = false;
      }
    },
    [checkRelay, connect, resolveRelay]
  );

  const leaveRoom = useCallback(() => disconnect(false), [disconnect]);

  const retryConnection = useCallback(async () => {
    if (!sessionInfoRef.current) return;
    clearReconnectTimer();

    const roomId = sessionInfoRef.current.roomId;
    const checked = await checkRelay(roomId);
    const relay = checked?.relay || (await resolveRelay(roomId));

    const updated: EnterRoomResult = relay ? { ...sessionInfoRef.current, relay } : sessionInfoRef.current;
    if (typeof checked?.offlineMessagesEnabled === 'boolean') {
      updated.offlineMessagesEnabled = checked.offlineMessagesEnabled;
    }
    sessionInfoRef.current = updated;
    persistActiveSession(updated);
    connect(updated, state.room);
  }, [checkRelay, clearReconnectTimer, connect, resolveRelay, state.room]);

  const sendMessage = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || !sessionInfoRef.current) return;

      const messageId = createId('msg');
      const outgoing: ChatMessage = {
        id: messageId,
        roomId: sessionInfoRef.current.roomId,
        senderId: sessionInfoRef.current.userId,
        senderNickname: sessionInfoRef.current.nickname,
        text: content,
        timestamp: Math.floor(Date.now() / 1000),
        direction: 'outgoing',
        status: 'sending',
        deliveryMode: peerRef.current ? 'p2p' : 'relay',
        colorKey: sessionInfoRef.current.userId
      };

      appendMessages([outgoing]);

      if (peerRef.current && state.p2pStatus === 'active') {
        const sent = peerRef.current.sendMessage(outgoing);
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: sent ? 'delivered' : 'failed' } : m)));
        if (!sent) socketRef.current?.sendMessage(messageId, content);
        return;
      }

      socketRef.current?.sendMessage(messageId, content);
      window.setTimeout(() => {
        setMessages((prev) => prev.map((m) => (m.id === messageId && m.status === 'sending' ? { ...m, status: 'sent' } : m)));
      }, 150);
    },
    [appendMessages, state.p2pStatus]
  );

  const value: SessionContextValue = {
    session,
    messages,
    members,
    historyLoading,
    hasMoreHistory,
    createAndEnterRoom,
    joinAndEnterRoom,
    restoreSession,
    leaveRoom,
    sendMessage,
    retryConnection,
    loadOlderMessages,
    setSelectedRoomId,
    selectedRoomId
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
