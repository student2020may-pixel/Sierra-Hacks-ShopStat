"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/assessment/scorecard", label: "Scorecard" },
  { href: "/assessment/jobs", label: "Jobs" },
  { href: "/assessment/estimate", label: "Estimate" },
];

// Pages that should render without app chrome (e.g. for screenshots).
const HIDDEN_ON = ["/mock-scorecard"];

export default function Nav() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  const link = (href: string) =>
    `pressable py-1 transition-colors ${pathname === href ? "text-gold" : "text-bone/75 hover:text-bone"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-night/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <nav className="px-safe mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 py-3" aria-label="Main">
        <Link href="/" className="pressable mr-auto font-serif text-2xl text-bone">
          Shop<span className="text-gold italic">Stats</span>
        </Link>
        <Link
          href="/admin"
          aria-current={pathname === "/admin" ? "page" : undefined}
          className={`pressable rounded-md px-2 py-1 font-mono text-[11px] tracking-[0.15em] uppercase ring-1 transition-colors sm:order-last ${
            pathname === "/admin" ? "text-gold ring-gold/60" : "text-gold/70 ring-gold/25 hover:text-gold hover:ring-gold/50"
          }`}
        >
          Admin
        </Link>
        {/* Phones: the links get their own row under the logo. */}
        <ul className="flex w-full gap-6 text-sm sm:w-auto">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={link(l.href)} aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
