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
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          Shop<span className="text-blue-600">Stats</span>
        </Link>
        <ul className="flex gap-1 text-sm font-medium">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`rounded-md px-3 py-2 transition-colors ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
