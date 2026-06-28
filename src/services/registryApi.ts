import { demoFallbackEnabled, normalizeHttpUrl } from '../utils/network';
import { createId } from '../utils/ids';
import type { AppSettings, RelayCreateResponse, RelayInfo, RoomDetails } from '../types';

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
    let parsedError = '';
    try {
      const parsed = JSON.parse(text) as { error?: string };
      parsedError = parsed.error || '';
    } catch {
      // Fall through to the raw response text.
    }
    throw new Error(parsedError || text || `Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

function demoRelay(publicUrl = 'localhost:9000'): RelayInfo {
  return {
    relayId: 'relay-demo',
    relayName: 'Local Relay',
    publicUrl,
    region: 'other',
    isOnline: true,
    currentRooms: 1,
    currentUsers: 2,
    maxRooms: 1000,
    maxUsers: 10000,
    lastHeartbeat: Math.floor(Date.now() / 1000),
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000)
  };
}

export async function getRegistryHealth(registryUrl: string): Promise<{ ok: boolean }> {
  try {
    return await requestJSON(`${normalizeHttpUrl(registryUrl)}/healthz`);
  } catch {
    return { ok: false };
  }
}

export async function listRelays(registryUrl: string): Promise<RelayInfo[]> {
  try {
    const data = await requestJSON<{ relays: RelayInfo[] }>(`${normalizeHttpUrl(registryUrl)}/api/relays`);
    return data.relays || [];
  } catch {
    if (!demoFallbackEnabled()) throw new Error('Unable to load relays.');
    return [demoRelay(), { ...demoRelay('localhost:9001'), relayId: 'relay-demo-2', relayName: 'Backup Relay', currentRooms: 0, currentUsers: 0 }];
  }
}

export async function chooseRelay(registryUrl: string): Promise<RelayInfo> {
  try {
    const data = await requestJSON<{ relay: RelayInfo }>(`${normalizeHttpUrl(registryUrl)}/api/relay/choose`);
    return data.relay;
  } catch {
    if (!demoFallbackEnabled()) throw new Error('Unable to choose relay.');
    return demoRelay();
  }
}

export async function createRoom(
  registryUrl: string,
  payload: { roomId?: string; pin?: string; maxUsers?: number; offlineMessagesEnabled?: boolean }
): Promise<RelayCreateResponse> {
  try {
    return await requestJSON<RelayCreateResponse>(`${normalizeHttpUrl(registryUrl)}/api/room/create`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch {
    if (!demoFallbackEnabled()) throw new Error('Unable to create room.');
    return {
      roomId: payload.roomId?.trim() || createId('room').slice(-6).toUpperCase(),
      relayId: 'relay-demo',
      publicUrl: 'localhost:9000',
      maxUsers: payload.maxUsers || 2,
      offlineMessagesEnabled: !!payload.offlineMessagesEnabled,
      createdAt: Math.floor(Date.now() / 1000)
    };
  }
}

export async function getRoomDetails(registryUrl: string, roomId: string): Promise<RoomDetails> {
  try {
    return await requestJSON<RoomDetails>(`${normalizeHttpUrl(registryUrl)}/api/room/${encodeURIComponent(roomId)}`);
  } catch {
    if (!demoFallbackEnabled()) throw new Error('Room not found.');
    return {
      room: {
        roomId,
        relayId: 'relay-demo',
        hasPin: false,
        maxUsers: 2,
        offlineMessagesEnabled: false,
        createdAt: Math.floor(Date.now() / 1000)
      },
      relay: demoRelay()
    };
  }
}
