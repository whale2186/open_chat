export function normalizeHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return resolveBrowserReachableUrl(withProtocol).replace(/\/$/, '');
}

export function httpToWsUrl(publicUrl: string): string {
  const normalized = publicUrl.trim();

  if (!normalized) return normalized;

  if (/^wss?:\/\//i.test(normalized)) {
    return resolveBrowserReachableUrl(normalized).replace(/\/$/, '');
  }

  if (/^https?:\/\//i.test(normalized)) {
    return resolveBrowserReachableUrl(normalized)
      .replace(/^https:/i, 'wss:')
      .replace(/^http:/i, 'ws:')
      .replace(/\/$/, '');
  }

  return resolveBrowserReachableUrl(`wss://${normalized}`).replace(/\/$/, '');
}

export function registryFallbackUrl(): string {
  return normalizeHttpUrl(
    (import.meta.env.VITE_DEFAULT_REGISTRY_URL as string | undefined) ??
      'https://localhost:8080'
  );
}

export function demoFallbackEnabled(): boolean {
  const value =
    (import.meta.env.VITE_ENABLE_DEMO_FALLBACK as string | undefined) ??
    'true';
  return value !== 'false';
}

function resolveBrowserReachableUrl(input: string): string {
  if (typeof window === 'undefined') return input;

  try {
    const url = new URL(input);
    const browserHost = window.location.hostname;

    if (
      isLoopbackHost(url.hostname) &&
      browserHost &&
      !isLoopbackHost(browserHost)
    ) {
      url.hostname = browserHost;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return input;
  }

  return input;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
}