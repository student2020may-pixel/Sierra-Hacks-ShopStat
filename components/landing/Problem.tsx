import CountUp from "./CountUp";

const STATS = [
  {
    value: 19.3,
    decimals: 1,
    suffix: " days",
    label: "average days to get a car back after a claim",
    why: "Every extra day is a family without a car, and a hit to your cycle-time score.",
  },
  {
    value: 46.7,
    decimals: 1,
    suffix: "%",
    label: "share of repair appraisals handled through insurer programs",
    why: "Nearly half of repair work runs through programs where your scorecard can decide who gets it.",
  },
  {
    text: "Quarterly",
    label: "how often many shops see their insurer scores",
    why: "By the time scores arrive, the jobs that caused them are long gone.",
  },
];

const SOURCES = [
  { name: "J.D. Power 2025", href: "https://www.jdpower.com/business/press-releases/2025-us-auto-claims-satisfaction-study" },
  { name: "CCC 2026", href: "https://www.repairerdrivennews.com/2026/04/10/ccc-report-shows-shift-to-drp-and-ai-appraisals/" },
  { name: "FenderBender", href: "https://www.fenderbender.com/articles/6674-maximizing-insurer-scorecard-ratings" },
];

export default function Problem() {
  return (
    <section className="px-safe w-full bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">The problem</h2>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-page p-5 sm:p-6">
              <div className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                {"value" in s && s.value !== undefined ? <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} /> : s.text}
              </div>
              <p className="mt-1 font-medium text-ink">{s.label}</p>
              <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-relaxed text-slate-600">{s.why}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-slate-500 sm:text-sm">
          Sources:{" "}
          {SOURCES.map((src, i) => (
            <span key={src.name}>
              <a href={src.href} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-primary">
                {src.name}
              </a>
              {i < SOURCES.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
