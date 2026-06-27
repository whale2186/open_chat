import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { RelayInfo, SavedRoom } from '../types';
import { getStoredValue, setStoredValue } from '../utils/storage';

const STORAGE_KEY = 'cyan-chat-saved-rooms-v1';

interface SaveRoomInput {
  roomId: string;
  nickname: string;
  relay?: RelayInfo;
  label?: string;
}

interface RoomsContextValue {
  savedRooms: SavedRoom[];
  saveRoom: (input: SaveRoomInput) => void;
  removeRoom: (roomId: string) => void;
  togglePinned: (roomId: string) => void;
  updateRoomLabel: (roomId: string, label: string) => void;
  getSavedRoom: (roomId: string) => SavedRoom | undefined;
}

const RoomsContext = createContext<RoomsContextValue | null>(null);

function normalizeLabel(input: SaveRoomInput) {
  const base = input.label?.trim() || input.roomId.trim();
  return base || input.roomId;
}

export function RoomsProvider({ children }: { children: React.ReactNode }) {
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>(() => getStoredValue<SavedRoom[]>(STORAGE_KEY, []));

  useEffect(() => {
    setStoredValue(STORAGE_KEY, savedRooms);
  }, [savedRooms]);

  const value = useMemo<RoomsContextValue>(() => {
    const upsertRoom = (input: SaveRoomInput) => {
      const roomId = input.roomId.trim();
      if (!roomId) return;
      const now = Date.now();
      const label = normalizeLabel(input);
      setSavedRooms((prev) => {
        const existing = prev.find((room) => room.roomId === roomId);
        if (existing) {
          return prev
            .map((room) =>
              room.roomId === roomId
                ? {
                    ...room,
                    label: input.label?.trim() ? label : room.label,
                    nickname: input.nickname.trim() || room.nickname,
                    relayId: input.relay?.relayId ?? room.relayId,
                    relayName: input.relay?.relayName ?? room.relayName,
                    publicUrl: input.relay?.publicUrl ?? room.publicUrl,
                    lastOpenedAt: now
                  }
                : room
            )
            .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || b.lastOpenedAt - a.lastOpenedAt);
        }

        const entry: SavedRoom = {
          roomId,
          label,
          nickname: input.nickname.trim() || 'Guest',
          relayId: input.relay?.relayId,
          relayName: input.relay?.relayName,
          publicUrl: input.relay?.publicUrl,
          pinned: false,
          createdAt: now,
          lastOpenedAt: now
        };
        return [entry, ...prev].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || b.lastOpenedAt - a.lastOpenedAt);
      });
    };

    const removeRoom = (roomId: string) => {
      setSavedRooms((prev) => prev.filter((room) => room.roomId !== roomId));
    };

    const togglePinned = (roomId: string) => {
      setSavedRooms((prev) =>
        prev
          .map((room) => (room.roomId === roomId ? { ...room, pinned: !room.pinned, lastOpenedAt: Date.now() } : room))
          .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || b.lastOpenedAt - a.lastOpenedAt)
      );
    };

    const updateRoomLabel = (roomId: string, label: string) => {
      const trimmedLabel = label.trim();
      setSavedRooms((prev) =>
        prev
          .map((room) =>
            room.roomId === roomId
              ? {
                  ...room,
                  label: trimmedLabel || room.roomId,
                  lastOpenedAt: Date.now()
                }
              : room
          )
          .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || b.lastOpenedAt - a.lastOpenedAt)
      );
    };

    const getSavedRoom = (roomId: string) => savedRooms.find((room) => room.roomId === roomId);

    return { savedRooms, saveRoom: upsertRoom, removeRoom, togglePinned, updateRoomLabel, getSavedRoom };
  }, [savedRooms]);

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
}

export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms must be used within RoomsProvider');
  return ctx;
}
