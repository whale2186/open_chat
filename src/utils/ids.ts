export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}-${random}`;
}

export function createUserId(nickname: string): string {
  const base = nickname.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || 'user'}-${Math.random().toString(36).slice(2, 7)}`;
}
