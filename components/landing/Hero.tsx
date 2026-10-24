import Link from "next/link";
import scorecardData from "@/data/scorecard.json";
import { formatValue } from "@/lib/format";
import type { Scorecard } from "@/lib/types";
import RadarPreview from "./RadarPreview";

const scorecard = scorecardData as Scorecard;
const cycle = scorecard.metrics.find((m) => m.key === "cycle_time")!;

export default function Hero() {
  return (
    <section className="px-safe relative w-full overflow-hidden bg-white py-12 sm:py-16 lg:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6 text-center sm:space-y-8 lg:text-left">
          <h1 className="animate-enter text-4xl leading-tight font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Get families back on the road faster.
          </h1>
          <p className="animate-enter mx-auto max-w-xl text-lg leading-relaxed text-slate-600 [animation-delay:60ms] sm:text-xl lg:mx-0 lg:text-2xl">
            ShopStats turns your insurance report card into a clear plan to cut repair times.
          </p>
          <div className="animate-enter pt-2 [animation-delay:120ms]">
            <Link
              href="/upload"
              className="pressable inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none sm:px-8 sm:text-lg"
            >
              Upload your scorecard
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Product preview: the real chart style, drawn from the fictional sample scorecard. */}
        <div className="animate-enter relative mx-auto w-full max-w-md [animation-delay:180ms]">
          <div
            aria-hidden
            className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-accent/35 via-primary/15 to-transparent blur-2xl"
          />
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-primary/10 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{scorecard.shop.name}</p>
                <p className="text-xs text-slate-500">Sample report · {scorecard.period.split(" (")[0]}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                ShopStats
              </span>
            </div>
            <div className="mx-auto mt-2 max-w-[280px]">
              <RadarPreview metrics={scorecard.metrics} />
            </div>
            <p className="flex items-center justify-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-center text-sm font-semibold text-danger">
              <span className="h-2 w-2 shrink-0 rounded-full bg-danger" aria-hidden />
              Cycle time: {formatValue(cycle.shopValue, cycle.unit)} vs {cycle.target} target
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
