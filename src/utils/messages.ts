import type { ChatMessage, PersistedMessage } from '../types';

export function mapPersistedMessage(msg: PersistedMessage, roomId: string, currentUserId: string): ChatMessage {
  const isOwn = msg.senderId === currentUserId;
  return {
    id: msg.messageId,
    roomId,
    senderId: msg.senderId,
    senderNickname: msg.nickname,
    text: msg.text,
    timestamp: msg.createdAt,
    direction: isOwn ? 'outgoing' : 'incoming',
    status: isOwn ? 'sent' : 'received',
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
