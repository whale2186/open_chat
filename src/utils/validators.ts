export function requireRoomId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Room ID is required.';
  return null;
}

export function requireNickname(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Nickname is required.';
  if (trimmed.length < 2) return 'Nickname should be at least 2 characters.';
  return null;
}
