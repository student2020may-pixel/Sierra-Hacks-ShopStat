// Server only. Per-IP counters live in memory, so they reset when a server instance restarts.
import { isAdmin } from "./admin";

export const FREE_AI_REQUESTS = 2;
const WINDOW_MS = 24 * 60 * 60 * 1000;
export const LIMIT_NOTICE = `You've used your ${FREE_AI_REQUESTS} free live analyses. Showing sample results.`;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

/** Counts one hit for this IP in a named window; false once it's over `max`. */
export function hit(scope: string, req: Request, max: number, windowMs: number): boolean {
  const now = Date.now();
  // Drop expired entries now and then so the map can't grow without bound.
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const key = `${scope}:${clientIp(req)}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return max >= 1;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

/**
 * Call right before an AI request. Admins are unlimited; everyone else gets FREE_AI_REQUESTS per
 * IP per 24 hours across scoring, fixes and questions.
 */
export function allowAiRequest(req: Request): boolean {
  return isAdmin(req) || hit("ai", req, FREE_AI_REQUESTS, WINDOW_MS);
}
