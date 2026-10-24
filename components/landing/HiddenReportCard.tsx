import { formatValue, meetsTarget } from "@/lib/format";
import { sampleFixes, sampleJobs, sampleScorecard } from "@/lib/sample";
import { letterGrade, shopLevel } from "@/lib/stats";

const level = shopLevel(sampleScorecard.metrics)!;

/** Before (what the insurer sends) and after (what ShopStats turns it into), both from the fictional sample. */
export default function HiddenReportCard() {
  return (
    <section className="px-safe w-full bg-page py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">From Scores to Solutions</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Insurers grade your shop on cycle time, customer satisfaction, repair cost, and more. Those grades can affect
            how much work they send you, but the report often arrives months later with no clue about which jobs pulled
            the numbers down.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Before</p>
                <p className="text-lg font-semibold text-ink">What your insurer sends</p>
              </div>
              <p className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Sample</p>
            </div>
            <ul className="flex-1 divide-y divide-slate-100">
              {sampleScorecard.metrics.map((m) => {
                const ok = meetsTarget(m);
                const highlight = m.key === "cycle_time";
                return (
                  <li key={m.key} className={`flex items-center justify-between gap-3 px-5 py-3 sm:px-6 ${highlight ? "bg-danger/5" : ""}`}>
                    <p className={`min-w-0 font-medium ${highlight ? "text-ink" : "text-slate-600"}`}>{m.label}</p>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-ink tabular-nums">{formatValue(m.shopValue, m.unit)}</span>
                      <span className={`w-14 rounded px-2 py-0.5 text-center text-xs font-bold ${ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {ok ? "MEETS" : "BELOW"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-slate-100 px-5 py-4 text-slate-500 sm:px-6">A grade, but no reason why.</p>
          </div>

          <div aria-hidden className="mx-auto flex h-12 w-12 rotate-90 items-center justify-center self-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 lg:rotate-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
            </svg>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-xl shadow-primary/25 sm:p-6">
            <div aria-hidden className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">After</p>
                <p className="text-lg font-semibold">What ShopStats shows</p>
              </div>
              <p className="shrink-0 rounded-md bg-accent/15 px-2.5 py-1 font-mono text-sm font-bold text-accent ring-1 ring-accent/40">
                Level {level} · {letterGrade(level)}
              </p>
            </div>
            <p className="relative mt-5 text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">
              {sampleJobs.flagged.length} jobs added <span className="text-accent">{sampleJobs.totalExtraDays} extra days</span> in the shop.
            </p>
            <p className="relative mt-2 text-white/75">
              Slowest: {sampleJobs.flagged[0].jobId}, {sampleJobs.flagged[0].daysInShop} days in the shop when about{" "}
              {sampleJobs.flagged[0].expectedDays.toFixed(1)} were expected.
            </p>
            <ol className="relative mt-5 space-y-2">
              {sampleFixes.map((f, i) => (
                <li key={f.title} className="flex gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-sm text-white/70">saves ~{f.daysSaved} days per car (estimate)</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
