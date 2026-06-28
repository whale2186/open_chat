import type { RoomSnapshot, RoomUser } from '../types';
import { httpToWsUrl } from '../utils/network';

type SocketEvent =
  | { type: 'open' }
  | { type: 'close'; code: number; reason: string }
  | { type: 'error'; error: string }
  | {
      type: 'room_joined';
      roomId: string;
      userId: string;
      room: RoomSnapshot;
      users: RoomUser[];
      offlineMessagesEnabled?: boolean;
    }
  | {
      type: 'user_joined';
      roomId: string;
      userId: string;
      nickname?: string;
      transport?: string;
      peerInfo?: Record<string, unknown>;
    }
  | { type: 'user_left'; roomId: string; userId: string }
  | {
      type: 'message';
      roomId: string;
      messageId: string;
      senderId: string;
      text: string;
      createdAt?: number;
      updatedAt?: number;
      status?: string;
      deliveryStatus?: Record<string, string>;
    }
  | {
      type: 'message_accepted';
      roomId?: string;
      messageId: string;
      senderId?: string;
      ok: boolean;
      createdAt?: number;
      updatedAt?: number;
      deliveryStatus?: Record<string, string>;
    }
  | {
      type: 'message_status';
      roomId: string;
      messageId: string;
      userId: string;
      status: string;
      updatedAt?: number;
      deliveryStatus?: Record<string, string>;
    }
  | { type: 'ack_accepted'; roomId: string; messageId: string; status: string; updatedAt?: number; ok?: boolean }
  | { type: 'signal'; senderId: string; payload: Record<string, unknown> }
  | { type: 'pong' };

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  nickname?: string;
  pin?: string;
  transport?: 'relay' | 'p2p';
  peerInfo?: Record<string, unknown>;
}

export interface RelaySocketOptions {
  url: string;
  onEvent: (event: SocketEvent) => void;
  onConnectionStateChange?: (connected: boolean) => void;
}

export class RelaySocket {
  private socket: WebSocket | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;

  private manualClose = false;
  private currentUrl: string;
  private listeners: RelaySocketOptions['onEvent'];
  private onConnectionStateChange?: RelaySocketOptions['onConnectionStateChange'];

  private lastPong = 0;
  private connectToken = 0;

  private readonly heartbeatIntervalMs = 2000;
  private readonly heartbeatTimeoutMs = 5000;
  private readonly reconnectDelayMs = 1200;

  constructor(options: RelaySocketOptions) {
    this.currentUrl = httpToWsUrl(options.url);
    this.listeners = options.onEvent;
    this.onConnectionStateChange = options.onConnectionStateChange;
  }

  updateUrl(url: string) {
    this.currentUrl = httpToWsUrl(url);
  }

  connect() {
    this.manualClose = false;
    this.connectToken += 1;
    const token = this.connectToken;

    this.clearReconnectTimer();
    this.cleanupSocket();

    const wsUrl = `${this.currentUrl}/ws`.replace(/([^:]\/)\/+/, '$1');
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      if (this.connectToken !== token) return;

      this.onConnectionStateChange?.(true);
      this.listeners({ type: 'open' });
      this.lastPong = Date.now();
      this.startHeartbeat(token);
    };

    socket.onclose = (ev) => {
      if (this.connectToken !== token) return;

      this.stopHeartbeat();
      this.onConnectionStateChange?.(false);
      this.listeners({ type: 'close', code: ev.code, reason: ev.reason });

      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };

    socket.onerror = () => {
      if (this.connectToken !== token) return;

      // Keep this quiet; close/heartbeat handles recovery.
      console.warn('WebSocket error on relay connection');
    };

    socket.onmessage = (ev) => {
      if (this.connectToken !== token) return;

      try {
        const data = JSON.parse(ev.data) as SocketEvent;

        if (data && typeof data === 'object' && 'type' in data && data.type === 'pong') {
          this.lastPong = Date.now();
        }

        this.listeners(data);
      } catch {
        this.listeners({ type: 'error', error: 'invalid_message' });
      }
    };
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => this.connect(), this.reconnectDelayMs);
  }

  private startHeartbeat(token: number) {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      if (this.connectToken !== token) {
        this.stopHeartbeat();
        return;
      }

      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const elapsed = Date.now() - this.lastPong;
      if (elapsed > this.heartbeatTimeoutMs) {
        try {
          this.socket.close(4000, 'heartbeat_timeout');
        } catch {
          // ignore
        }
        return;
      }

      this.send({ type: 'ping' });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanupSocket() {
    if (!this.socket) return;

    try {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
    } catch {
      // ignore
    } finally {
      this.socket = null;
    }
  }

  send(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  joinRoom(payload: JoinRoomPayload) {
    this.send({ type: 'join_room', ...payload });
  }

  leaveRoom() {
    this.send({ type: 'leave_room' });
  }

  sendMessage(messageId: string, text: string, recipientId?: string) {
    this.send({ type: 'message', messageId, text, recipientId });
  }

  sendAck(messageId: string, status: 'delivered' | 'read' = 'delivered') {
    this.send({ type: 'ack', messageId, status });
  }

  sendSignal(targetUserId: string, payload: Record<string, unknown>) {
    this.send({ type: 'signal', targetUserId, payload });
  }

  close() {
    this.manualClose = true;
    this.connectToken += 1;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.cleanupSocket();
  }

  isOpen() {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}
