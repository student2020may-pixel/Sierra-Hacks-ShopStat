// Server only: imported by API routes, never by a client component.
import { createHash, timingSafeEqual } from "node:crypto";

const ADMIN_CODE = "ss101";
export const ADMIN_COOKIE = "ss_admin";
export const ADMIN_MAX_AGE = 7 * 24 * 60 * 60; // seconds

/** The cookie holds a hash of the code, not the code itself. */
const TOKEN = createHash("sha256").update(`shopstats-admin:${ADMIN_CODE}`).digest("hex");

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const isAdminCode = (code: string) => same(code.trim(), ADMIN_CODE);

export function adminToken(): string {
  return TOKEN;
}

/** True when the request carries a valid admin cookie. */
export function isAdmin(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return match ? same(match[1], TOKEN) : false;
}
