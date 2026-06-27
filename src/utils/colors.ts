const COLORS = [
  '#0ea5e9',
  '#14b8a6',
  '#8b5cf6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
  '#06b6d4'
];

export function pickAccentColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export function alphaHex(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
