import { normalizeHttpUrl } from '../utils/network';
import type { MessageHistoryResponse, PersistRoomMessageRequest } from '../types';

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface GetMessagesOptions {
  before?: number;
  limit?: number;
}

export async function getRoomMessages(
  relayPublicUrl: string,
  roomId: string,
  options: GetMessagesOptions = {}
): Promise<MessageHistoryResponse> {
  const base = normalizeHttpUrl(relayPublicUrl);
  const params = new URLSearchParams();
  if (options.before != null) params.set('before', String(options.before));
  if (options.limit != null) params.set('limit', String(options.limit));
  const qs = params.toString();
  const url = `${base}/api/room/${encodeURIComponent(roomId)}/messages${qs ? `?${qs}` : ''}`;
  return requestJSON<MessageHistoryResponse>(url);
}

export async function persistRoomMessage(
  relayPublicUrl: string,
  roomId: string,
  message: PersistRoomMessageRequest
): Promise<{ ok: boolean }> {
  const base = normalizeHttpUrl(relayPublicUrl);
  return requestJSON<{ ok: boolean }>(`${base}/api/room/${encodeURIComponent(roomId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(message)
  });
}
