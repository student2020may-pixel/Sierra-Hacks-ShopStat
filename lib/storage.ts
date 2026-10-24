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

/** Like load(), but discards values that don't pass the shape check (stale versions, hand-edited storage). */
export function loadValid<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const value = load<unknown>(key);
  return isValid(value) ? value : null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isScoreResult(v: unknown): v is { metrics: unknown[] } {
  return isObject(v) && Array.isArray(v.metrics) && v.metrics.length > 0 && v.metrics.every((m) => isObject(m) && typeof m.score === "number" && typeof m.key === "string");
}

export function isJobsResult(v: unknown): v is { jobs: unknown[]; flagged: unknown[]; totalExtraDays: number } {
  return isObject(v) && Array.isArray(v.jobs) && Array.isArray(v.flagged) && typeof v.totalExtraDays === "number" && isObject(v.fit);
}
