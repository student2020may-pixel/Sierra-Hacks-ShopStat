import { formatValue, meetsTarget } from "@/lib/format";
import { sampleFixes, sampleJobs, sampleScorecard } from "@/lib/sample";

const rows = ["cycle_time", "on_time_delivery", "avg_repair_cost"].map(
  (k) => sampleScorecard.metrics.find((m) => m.key === k)!,
);
const topFix = sampleFixes[0];

export default function HiddenReportCard() {
  return (
    <section className="px-safe w-full bg-page py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">Your hidden report card</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:text-xl">
            Insurers grade your shop on cycle time, customer satisfaction, repair cost, and more. Those grades can affect
            how much work they send you, but the report often arrives months later with no clue about which jobs pulled
            the numbers down.
          </p>
        </div>

        {/* Left: what the insurer sends. Right: what ShopStats turns it into. Both use the fictional sample data. */}
        <div className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <p className="text-sm font-semibold text-slate-700">Insurer scorecard</p>
              <p className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Sample</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {rows.map((m, i) => {
                const ok = meetsTarget(m);
                return (
                  <li key={m.key} className={`flex items-center justify-between gap-3 px-5 py-4 ${i === 0 ? "bg-danger/5" : ""}`}>
                    <div className="min-w-0">
                      <p className={`font-semibold ${i === 0 ? "text-ink" : "text-slate-500"}`}>{m.label}</p>
                      <p className="text-xs text-slate-500">Target {formatValue(m.target, m.unit)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`font-semibold tabular-nums ${i === 0 ? "text-ink" : "text-slate-500"}`}>
                        {formatValue(m.shopValue, m.unit)}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                      >
                        {ok ? "MEETS" : "BELOW"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">A grade, but no reason why.</p>
          </div>

          <div aria-hidden className="mx-auto flex h-11 w-11 rotate-90 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 lg:rotate-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
            </svg>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl shadow-primary/25">
            <div aria-hidden className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
            <p className="relative text-sm font-semibold text-accent">What ShopStats shows</p>
            <p className="relative mt-3 text-2xl font-semibold tracking-tight">
              {sampleJobs.flagged.length} jobs added {sampleJobs.totalExtraDays} extra days in the shop.
            </p>
            <div className="relative mt-5 rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">Top fix</p>
              <p className="mt-1 font-semibold">{topFix.title}</p>
              <p className="mt-1 text-sm text-white/75">saves ~{topFix.daysSaved} days per car (estimate)</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
