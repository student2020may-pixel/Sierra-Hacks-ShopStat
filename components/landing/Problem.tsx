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
    <section className="px-safe w-full bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          The problem
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-page p-7 sm:p-8"
            >
              <div aria-hidden className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div className="mt-6 text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
                {"value" in s && s.value !== undefined ? <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} /> : s.text}
              </div>
              <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500 sm:text-sm">Sources: J.D. Power 2025, CCC 2026, FenderBender</p>
      </div>
    </section>
  );
}
