"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type LinkId = "assessment" | "results" | "how" | "sample";
const LINKS: { id: LinkId; href: string; label: string }[] = [
  { id: "how", href: "/#how-it-works", label: "How it works" },
  { id: "sample", href: "/results?sample=1", label: "Sample report" },
  { id: "assessment", href: "/assessment/scorecard", label: "Assessment" },
  { id: "results", href: "/results", label: "Results" },
];

// Pages that should render without app chrome (e.g. for screenshots).
const HIDDEN_ON = ["/mock-scorecard"];

function activeLink(pathname: string, sample: boolean): LinkId | null {
  if (pathname.startsWith("/assessment")) return "assessment";
  if (pathname.startsWith("/results")) return sample ? "sample" : "results";
  return null;
}

function NavBar({ sample }: { sample: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = activeLink(pathname, sample);

  // Close the phone menu when the page changes or Escape is pressed.
  useEffect(() => setOpen(false), [pathname, sample]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (HIDDEN_ON.includes(pathname)) return null;

  const linkClass = (id: LinkId) =>
    `pressable block rounded-md px-3 py-2.5 ${
      active === id ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-primary/95 pt-[env(safe-area-inset-top)] shadow-sm shadow-black/10 backdrop-blur">
      <nav className="px-safe mx-auto flex max-w-6xl items-center justify-between py-2" aria-label="Main">
        <Link href="/" className="pressable py-2 text-lg font-bold tracking-tight text-white">
          Shop<span className="text-accent">Stats</span>
        </Link>

        <ul className="hidden items-center gap-1 text-sm font-medium md:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <Link href={l.href} className={linkClass(l.id)} aria-current={active === l.id ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="pressable -mr-2 flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-white/10 md:hidden"
        >
          <svg aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <ul id="mobile-menu" className="px-safe animate-enter space-y-1 border-t border-white/10 pt-2 pb-3 text-base font-medium md:hidden">
          {LINKS.map((l) => (
            <li key={l.id}>
              <Link href={l.href} onClick={() => setOpen(false)} className={linkClass(l.id)} aria-current={active === l.id ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

function NavWithParams() {
  return <NavBar sample={useSearchParams().get("sample") === "1"} />;
}

/** Search params need a Suspense boundary on statically rendered pages; the fallback just can't tell "Sample report" apart. */
export default function Nav() {
  return (
    <Suspense fallback={<NavBar sample={false} />}>
      <NavWithParams />
    </Suspense>
  );
}
