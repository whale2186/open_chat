export function formatClock(ts?: number): string {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatShortDate(ts?: number): string {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function timeLabel(ts?: number): string {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}
