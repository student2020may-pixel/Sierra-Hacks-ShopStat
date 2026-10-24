import Link from "next/link";
import { formatValue } from "@/lib/format";
import { sampleJobs, sampleScorecard } from "@/lib/sample";
import StatSheet from "../StatSheet";

const metrics = sampleScorecard.metrics;
const cycle = metrics.find((m) => m.key === "cycle_time")!;
const worstJob = sampleJobs.flagged[0];

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-primary to-ink text-white">
      {/* Faint grid that fades out toward the edges, plus a cyan glow behind the preview. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-[size:48px_48px]"
      />
      <div aria-hidden className="absolute top-1/3 right-[-10%] -z-10 h-[32rem] w-[32rem] rounded-full bg-accent/25 blur-3xl" />

      <div className="px-safe mx-auto grid max-w-6xl items-center gap-12 pt-12 pb-16 sm:pt-16 sm:pb-28 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:pt-20 lg:pb-32">
        <div className="text-center lg:text-left">
          <p className="animate-enter inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            For independent body shops
          </p>
          <h1 className="animate-enter mt-6 text-[2.75rem] leading-[1.05] font-semibold tracking-tight [animation-delay:60ms] sm:text-6xl lg:text-7xl">
            Get families back on the road <span className="text-accent">faster.</span>
          </h1>
          <p className="animate-enter mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75 [animation-delay:120ms] sm:text-xl lg:mx-0">
            ShopStats turns your insurance report card into a clear plan to cut repair times.
          </p>
          <div className="animate-enter mt-9 flex flex-col items-center gap-3 [animation-delay:180ms] sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/assessment/scorecard"
              className="pressable inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-semibold text-ink shadow-[0_0_40px_-8px] shadow-accent/60 hover:bg-white focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none sm:w-auto"
            >
              Start shop assessment <span aria-hidden>→</span>
            </Link>
            <Link
              href="/results?sample=1"
              className="pressable inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-7 py-4 text-base font-semibold text-white hover:bg-white/10 sm:w-auto"
            >
              See a sample report
            </Link>
          </div>
          <p className="animate-enter mt-5 text-sm text-white/55 [animation-delay:220ms]">A photo, screenshot, or PDF works.</p>
        </div>

        {/* Product preview: a framed snapshot of the Results screen, filled with the fictional sample data. */}
        <div className="animate-enter relative mx-auto w-full max-w-xl [animation-delay:200ms] lg:max-w-none">
          {/* Floating details: the headline problem and the worst job behind it. */}
          <p className="relative z-10 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-danger px-3.5 py-1.5 text-sm font-semibold text-white shadow-lg shadow-danger/30 sm:absolute sm:-top-4 sm:-right-4 sm:mx-0 sm:mb-0">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            Cycle time: {formatValue(cycle.shopValue, cycle.unit)} vs {cycle.target} target
          </p>
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-white text-ink shadow-2xl shadow-black/40 ring-1 ring-white/10">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="ml-3 truncate text-xs text-slate-500">shopstats · results · sample</span>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-xl bg-primary px-4 py-3 text-white">
                <p className="text-base font-semibold sm:text-lg">
                  {sampleScorecard.shop.name} is losing{" "}
                  <span className="whitespace-nowrap">
                    <span className="text-accent">{sampleJobs.totalExtraDays}</span> car-days
                  </span>{" "}
                  a quarter
                </p>
                <p className="text-xs text-white/70">
                  That&apos;s {sampleJobs.totalExtraDays} days families spent without their car.
                </p>
              </div>
              <StatSheet metrics={metrics} />
            </div>
          </div>

          <div className="relative mx-4 -mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-ink shadow-xl sm:absolute sm:-bottom-20 sm:-left-8 sm:mx-0 sm:mt-0 sm:w-64">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Slowest job</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <p className="font-semibold">{worstJob.jobId}</p>
              <p className="font-semibold text-danger tabular-nums">+{worstJob.extraDays.toFixed(1)} days</p>
            </div>
            <p className="text-xs text-slate-500">
              {worstJob.daysInShop} days in shop, expected {worstJob.expectedDays.toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
