export type ThemeMode = 'light' | 'dark';

export type RelayPreferenceMode = 'auto' | 'manual';

export type ConnectionStatus =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error';

export type P2PStatus = 'disabled' | 'negotiating' | 'active' | 'unavailable';

export type MessageDirection = 'incoming' | 'outgoing' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export interface AppSettings {
  registryUrl: string;
  nickname: string;
  themeMode: ThemeMode;
  relayPreferenceMode: RelayPreferenceMode;
  selectedRelayId: string;
  chatBackgroundImage: string;
  accentColor: string;
  savedAccentColors: string[];
  offlineMessagesEnabled: boolean;
  persistentChatEnabled: boolean;
}

export interface RelayInfo {
  relayId: string;
  relayName: string;
  publicUrl: string;
  region: string;
  isOnline?: boolean;
  currentRooms?: number;
  currentUsers?: number;
  maxRooms?: number;
  maxUsers?: number;
  lastHeartbeat?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface RelayCreateResponse {
  roomId: string;
  relayId: string;
  publicUrl: string;
  maxUsers: number;
  offlineMessagesEnabled?: boolean;
  createdAt: number;
}

export interface RoomUser {
  userId: string;
  nickname?: string;
  transport?: string;
  peerInfo?: Record<string, unknown>;
  connected?: boolean;
  joinedAt?: number;
  lastSeenAt?: number;
}

export interface RoomSnapshot {
  roomId: string;
  maxUsers: number;
  connectedUsers: number;
  memberCount: number;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  lastActivityAt?: number;
  offlineMessagesEnabled?: boolean;
  users: RoomUser[];
}

export interface RoomDetails {
  room: {
    roomId: string;
    relayId: string;
    hasPin: boolean;
    maxUsers: number;
    offlineMessagesEnabled?: boolean;
    createdAt: number;
  };
  relay: RelayInfo;
}

export interface JoinRoomRequest {
  mode: 'create' | 'join';
  roomId?: string;
  nickname: string;
  pin?: string;
  maxUsers?: number;
  offlineMessagesEnabled?: boolean;
}

export interface EnterRoomResult {
  roomId: string;
  relay: RelayInfo;
  userId: string;
  nickname: string;
  hasPin?: boolean;
  maxUsers?: number;
  offlineMessagesEnabled?: boolean;
  mode: 'create' | 'join';
  pin?: string;
}

export interface PersistedMessage {
  messageId: string;
  senderId: string;
  nickname: string;
  text: string;
  createdAt: number;
}

export interface MessageHistoryResponse {
  roomId: string;
  messages: PersistedMessage[];
  hasMore: boolean;
}

export interface PersistRoomMessageRequest {
  messageId: string;
  senderId: string;
  nickname: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  text: string;
  timestamp: number;
  direction: MessageDirection;
  status: MessageStatus;
  deliveryMode: 'relay' | 'p2p' | 'system';
  colorKey: string;
  systemKind?: 'info' | 'error';
}

export interface ChatSession {
  roomId: string;
  relay: RelayInfo;
  userId: string;
  nickname: string;
  members: RoomUser[];
  room: RoomSnapshot | null;
  connectionStatus: ConnectionStatus;
  p2pStatus: P2PStatus;
  error?: string | null;
  hasPin?: boolean;
  offlineMessagesEnabled?: boolean;
}

export interface SavedRoom {
  roomId: string;
  label: string;
  nickname: string;
  relayId?: string;
  relayName?: string;
  publicUrl?: string;
  offlineMessagesEnabled?: boolean;
  pinned: boolean;
  lastOpenedAt: number;
  createdAt: number;
}
