import CountUp from "./CountUp";

const ICONS = {
  clock: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
};

const STATS = [
  { icon: ICONS.clock, value: 19.3, decimals: 1, suffix: " days", label: "average days to get a car back after a claim" },
  { icon: ICONS.shield, value: 46.7, decimals: 1, suffix: "%", label: "share of repair appraisals handled through insurer programs" },
  { icon: ICONS.calendar, text: "Quarterly", label: "how often many shops see their insurer scores" },
];

export default function Problem() {
  return (
    <section className="px-safe w-full bg-page py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-center text-3xl font-bold text-ink sm:mb-12 sm:text-4xl lg:text-5xl">The problem</h2>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div className="text-3xl font-bold text-primary sm:text-4xl lg:text-5xl">
                {"value" in s && s.value !== undefined ? <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} /> : s.text}
              </div>
              <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 sm:text-sm">Sources: J.D. Power 2025, CCC 2026, FenderBender</p>
      </div>
    </section>
  );
}
