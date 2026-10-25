"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type LinkId = "assessment" | "results" | "how" | "sample";
const LINKS: { id: LinkId; href: string; label: string }[] = [
  { id: "how", href: "/#how-it-works", label: "How it works" },
  { id: "sample", href: "/results?sample=1", label: "Sample report" },
  { id: "assessment", href: "/assessment/scorecard", label: "Assessment" },
  { id: "results", href: "/results", label: "Results" },
];

// Pages that should render without app chrome (e.g. for screenshots).
const HIDDEN_ON = ["/mock-scorecard"];
/** Past this much scroll the bar gets its blurred background. */
const SOLID_AFTER = 40;
/** Don't hide the bar until the visitor is past the first screenful's top. */
const HIDE_AFTER = 120;

function activeLink(pathname: string, sample: boolean): LinkId | null {
  if (pathname.startsWith("/assessment")) return "assessment";
  if (pathname.startsWith("/results")) return sample ? "sample" : "results";
  return null;
}

function NavBar({ sample }: { sample: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const active = activeLink(pathname, sample);
  const overHero = pathname === "/"; // the landing hero runs under a transparent bar

  // Blur after 40px; slide away on scroll down, back on scroll up.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setScrolled(y > SOLID_AFTER);
        if (Math.abs(y - lastY.current) > 4) {
          setHidden(y > lastY.current && y > HIDE_AFTER);
          lastY.current = y;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Close the menu when the page changes; Escape closes it; the page behind it doesn't scroll.
  useEffect(() => setOpen(false), [pathname, sample]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (HIDDEN_ON.includes(pathname)) return null;

  const solid = scrolled || !overHero || open;
  const desktopLink = (id: LinkId) =>
    `link-lux pressable py-1 transition-colors ${active === id ? "text-gold" : "text-bone/80 hover:text-bone"}`;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-[transform,background-color,backdrop-filter] duration-[250ms] ease-[ease] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${solid ? "border-b border-line bg-night/70 backdrop-blur-md" : "border-b border-transparent bg-transparent"}`}
      >
        <nav className="px-safe mx-auto flex h-15 max-w-6xl items-center justify-between" aria-label="Main">
          <Link href="/" className="pressable font-serif text-3xl text-bone sm:text-4xl">
            Shop<span className="text-gold italic">Stats</span>
          </Link>

          <div className="flex items-center gap-3 md:gap-7">
            <ul className="hidden items-center gap-7 text-sm md:flex">
              {LINKS.map((l) => (
                <li key={l.id}>
                  <Link href={l.href} className={desktopLink(l.id)} aria-current={active === l.id ? "page" : undefined}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={`pressable rounded-md px-2 py-1 font-mono text-[11px] tracking-[0.15em] uppercase ring-1 transition-colors ${
                pathname === "/admin" ? "text-gold ring-gold/60" : "text-gold/70 ring-gold/25 hover:text-gold hover:ring-gold/50"
              }`}
            >
              Admin
            </Link>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="pressable relative z-10 -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-bone md:hidden"
            >
              <svg aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                {open ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" d="M4 9h16M4 15h16" />}
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Phones: a full-screen menu with large serif links that fade in one after another. */}
      {open && (
        <div id="mobile-menu" className="fixed inset-0 z-40 flex flex-col bg-night px-safe pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] md:hidden">
          <ul className="space-y-2">
            {LINKS.map((l, i) => (
              <li key={l.id} className="menu-item" style={{ ["--i" as string]: i }}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active === l.id ? "page" : undefined}
                  className={`pressable block py-2 font-serif text-5xl ${active === l.id ? "text-gold italic" : "text-bone"}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="menu-item mt-auto text-sm text-muted" style={{ ["--i" as string]: LINKS.length }}>
            Built at Sierra Hacks 2026
          </p>
        </div>
      )}

      {/* Other pages start below the fixed bar; the landing hero sits under it on purpose. */}
      {!overHero && <div aria-hidden className="h-[calc(3.75rem+env(safe-area-inset-top))]" />}
    </>
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
