"use client";

export default function Footer() {
  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <footer className="px-safe overflow-hidden border-t border-line bg-night pt-16 pb-[calc(2rem+env(safe-area-inset-bottom))] text-bone">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-1 text-sm text-bone/70">
            <p>Team: Ishaan Bhatnagar and Sidhak Makkar</p>
            <p>Built at Sierra Hacks 2026</p>
            <p className="text-muted">Valley Auto Body and Granite Mutual are fictional sample data.</p>
          </div>
          <button type="button" onClick={toTop} className="btn-lux">
            Back to top <span className="arrow -rotate-90" aria-hidden>→</span>
          </button>
        </div>
        <p aria-hidden className="mt-14 text-center font-serif text-[19vw] leading-[0.8] tracking-tight text-bone/90 select-none lg:text-[13.5rem]">
          SHOPSTATS
        </p>
      </div>
    </footer>
  );
}
