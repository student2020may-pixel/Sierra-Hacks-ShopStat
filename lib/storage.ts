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

export function remove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is blocked.
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

export function isJobsResult(v: unknown): v is { jobs: unknown[]; flagged: unknown[]; totalExtraDays: number } {
  return isObject(v) && Array.isArray(v.jobs) && Array.isArray(v.flagged) && typeof v.totalExtraDays === "number" && isObject(v.fit);
}

/** Labels shown when a step is revisited: the scorecard file name, and where the jobs came from. */
export const SCORE_FILE_KEY = "shopstats:score-file";
export const JOBS_SOURCE_KEY = "shopstats:jobs-source";
