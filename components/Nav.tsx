"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/upload", label: "Upload" },
  { href: "/jobs", label: "Jobs" },
  { href: "/results", label: "Results" },
];

// Pages that should render without app chrome (e.g. for screenshots).
const HIDDEN_ON = ["/mock-scorecard"];

export default function Nav() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <header className="bg-primary pt-[env(safe-area-inset-top)]">
      <nav className="px-safe mx-auto flex max-w-5xl items-center justify-between py-2">
        <Link href="/" className="pressable py-2 text-lg font-bold tracking-tight text-white">
          Shop<span className="text-accent">Stats</span>
        </Link>
        <ul className="flex gap-1 text-sm font-medium">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`pressable block rounded-md px-3 py-2.5 ${
                    active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
