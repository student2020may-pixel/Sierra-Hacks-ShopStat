// Per-tab hand-off between pages (upload → results). Wrapped in try/catch because
// sessionStorage can throw in private windows or when storage is blocked.

export const SCORE_KEY = "shopstats:score";
export const JOBS_KEY = "shopstats:jobs";

export function save<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Non-fatal: the current page still shows the result.
  }
}

export function load<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
