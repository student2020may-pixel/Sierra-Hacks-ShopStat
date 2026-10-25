import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, adminToken, isAdmin, isAdminCode } from "@/lib/admin";
import { hit } from "@/lib/usage";

export const runtime = "nodejs";

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Whether this browser is unlocked. */
export function GET(req: Request) {
  return NextResponse.json({ unlocked: isAdmin(req) });
}

/** Unlock with the admin code; sets a 7-day httpOnly cookie. */
export async function POST(req: Request) {
  // Slows down guessing: 10 tries per IP per hour.
  if (!hit("admin", req, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tries. Wait an hour and try again." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.slice(0, 100) : "";
  if (!isAdminCode(code)) return NextResponse.json({ error: "Wrong code." }, { status: 401 });

  const res = NextResponse.json({ unlocked: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), { ...cookieBase, maxAge: ADMIN_MAX_AGE });
  return res;
}

/** Lock: clears the cookie. */
export function DELETE() {
  const res = NextResponse.json({ unlocked: false });
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieBase, maxAge: 0 });
  return res;
}
