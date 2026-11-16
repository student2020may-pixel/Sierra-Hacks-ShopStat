import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";

// ShopStats is private for now: every page and API needs the admin cookie set by /admin.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/|icon.svg|apple-icon.png|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin" || pathname === "/api/admin" || isAdmin(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Enter the access code first." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
