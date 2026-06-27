export function getStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures
  }
}

export function removeStoredValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getSessionValue<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSessionValue<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures
  }
}

export function removeSessionValue(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
