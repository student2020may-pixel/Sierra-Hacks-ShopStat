import scorecardData from "@/data/scorecard.json";
import { formatValue, meetsTarget } from "@/lib/format";
import type { Scorecard } from "@/lib/types";

const scorecard = scorecardData as Scorecard;
const ROWS = ["cycle_time", "on_time_delivery", "avg_repair_cost"].map((k) => scorecard.metrics.find((m) => m.key === k)!);

export default function HiddenReportCard() {
  return (
    <section className="px-safe w-full bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-4 text-center lg:text-left">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl lg:text-5xl">Your hidden report card</h2>
          <p className="text-lg leading-relaxed text-slate-600 sm:text-xl">
            Insurers grade your shop on cycle time, customer satisfaction, repair cost, and more. Those grades can affect
            how much work they send you, but the report often arrives months later with no clue about which jobs pulled
            the numbers down.
          </p>
        </div>

        {/* Styled like an insurer report so the idea lands at a glance; values are the fictional sample. */}
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-primary/10">
          <div className="flex items-center justify-between gap-3 bg-primary px-5 py-3 text-white">
            <p className="text-sm font-semibold">Repair Facility Scorecard</p>
            <p className="shrink-0 text-xs text-white/70">Sample</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {ROWS.map((m, i) => {
              const ok = meetsTarget(m);
              return (
                <li
                  key={m.key}
                  className={`flex items-center justify-between gap-3 px-5 py-4 ${i === 0 ? "bg-danger/5" : "opacity-60"}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{m.label}</p>
                    <p className="text-xs text-slate-500">Target {formatValue(m.target, m.unit)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold text-ink tabular-nums">{formatValue(m.shopValue, m.unit)}</span>
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
        </div>
      </div>
    </section>
  );
}
