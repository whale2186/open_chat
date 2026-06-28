import type { ChatMessage, MessageStatus, PersistedMessage } from '../types';

export function statusFromDeliveryStatus(deliveryStatus?: Record<string, string>): MessageStatus | null {
  const statuses = Object.values(deliveryStatus || {});
  if (!statuses.length) return null;
  if (statuses.every((status) => status === 'read')) return 'read';
  if (statuses.some((status) => status === 'delivered' || status === 'read')) return 'delivered';
  if (statuses.some((status) => status === 'sent' || status === 'pending')) return 'sent';
  return null;
}

export function mapPersistedMessage(msg: PersistedMessage, roomId: string, currentUserId: string): ChatMessage {
  const isOwn = msg.senderId === currentUserId;
  return {
    id: msg.messageId,
    roomId: msg.roomId || roomId,
    senderId: msg.senderId,
    senderNickname: msg.nickname || msg.senderId,
    text: msg.text,
    timestamp: msg.createdAt,
    direction: isOwn ? 'outgoing' : 'incoming',
    status: isOwn ? statusFromDeliveryStatus(msg.deliveryStatus) || 'sent' : 'received',
    deliveryMode: 'relay',
    colorKey: msg.senderId
  };
}

export function mergeMessages(...groups: ChatMessage[][]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const group of groups) {
    for (const msg of group) {
      const existing = map.get(msg.id);
      if (!existing) {
        map.set(msg.id, msg);
        continue;
      }
      if (existing.direction === 'outgoing' && existing.status !== 'received') {
        map.set(msg.id, { ...msg, direction: existing.direction, status: existing.status });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

export function getOldestChatTimestamp(messages: ChatMessage[]): number | null {
  const chatMessages = messages.filter((m) => m.direction !== 'system');
  if (!chatMessages.length) return null;
  return Math.min(...chatMessages.map((m) => m.timestamp));
}
