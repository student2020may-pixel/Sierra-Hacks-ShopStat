"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import Notice from "@/components/Notice";
import Skeleton from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import sampleFixes from "@/data/sample-fixes.json";
import scorecardData from "@/data/scorecard.json";
import { detectOutliers, type AnomalyResult } from "@/lib/anomaly";
import { parseJobsCsv } from "@/lib/csv";
import { formatCount } from "@/lib/format";
import { isJobsResult, isScoreResult, JOBS_KEY, loadValid, SCORE_KEY } from "@/lib/storage";
import { isScored, type Fix, type FixesRequest, type FixesResponse, type Metric, type Scorecard, type ScoredMetric, type ScoreResponse } from "@/lib/types";

const ScoreRadar = dynamic(() => import("@/components/ScoreRadar"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 sm:h-96" />,
});

const scorecard = scorecardData as Scorecard;
const SHOP_NAME = scorecard.shop.name;

interface Inputs {
  metrics: Metric[];
  jobs: AnomalyResult | null;
  sampleScores: boolean;
  sampleJobs: boolean;
}

async function loadInputs(): Promise<Inputs> {
  // Saved results from an older version, or edited by hand, count as "not uploaded" rather than crashing the page.
  const score = loadValid(SCORE_KEY, isScoreResult) as ScoreResponse | null;
  let jobs = loadValid(JOBS_KEY, isJobsResult) as AnomalyResult | null;
  const sampleJobs = !jobs;
  if (!jobs) {
    try {
      const res = await fetch("/api/sample-jobs");
      const parsed = parseJobsCsv(await res.text());
      if (parsed.ok) jobs = detectOutliers(parsed.jobs);
    } catch {
      // The rest of the page still works without job data.
    }
  }
  return { metrics: score?.metrics ?? scorecard.metrics, jobs, sampleScores: !score, sampleJobs };
}

async function fetchFixes(inputs: Inputs): Promise<FixesResponse> {
  const body: FixesRequest = {
    metrics: inputs.metrics,
    flagged: (inputs.jobs?.flagged ?? []).map(({ jobId, laborHours, daysInShop, expectedDays, extraDays, supplements }) => ({
      jobId,
      laborHours,
      daysInShop,
      expectedDays,
      extraDays,
      supplements,
    })),
    totalExtraDays: inputs.jobs?.totalExtraDays ?? 0,
    jobCount: inputs.jobs?.jobs.length ?? 0,
  };
  try {
    const res = await fetch("/api/fixes", {
      method: "POST",
      signal: AbortSignal.timeout(55_000), // a little past the server's 40s AI timeout
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const valid =
      res.ok &&
      Array.isArray(data?.fixes) &&
      data.fixes.length > 0 &&
      data.fixes.every((f: Partial<Fix>) => typeof f?.title === "string" && typeof f.daysSaved === "number");
    if (valid) return data as FixesResponse;
  } catch {
    // Fall through to the sample fixes below.
  }
  return {
    source: "sample",
    fixes: sampleFixes as Fix[],
    notice: "We couldn't reach the server for fixes, so here are sample fixes.",
  };
}

function SampleNote({ sampleScores, sampleJobs }: Pick<Inputs, "sampleScores" | "sampleJobs">) {
  if (!sampleScores && !sampleJobs) return null;
  const links = (
    <>
      {sampleScores && (
        <Link href="/upload" className="pressable inline-block font-semibold underline">
          Upload your scorecard
        </Link>
      )}
      {sampleScores && sampleJobs && " · "}
      {sampleJobs && (
        <Link href="/jobs" className="pressable inline-block font-semibold underline">
          Check your jobs
        </Link>
      )}
    </>
  );
  const what =
    sampleScores && sampleJobs ? "anything yet" : sampleScores ? "a scorecard yet" : "a jobs file yet";
  return (
    <Notice kind="info">
      You haven&apos;t uploaded {what}, so this page shows sample data for {SHOP_NAME}. {links}
    </Notice>
  );
}

function Banner({ jobs }: { jobs: AnomalyResult | null }) {
  const days = jobs?.totalExtraDays ?? 0;
  const n = formatCount(days);
  return (
    <section className="animate-enter rounded-2xl bg-primary px-5 py-7 text-white sm:px-10 sm:py-8">
      {days > 0 ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {SHOP_NAME} is losing{" "}
            <span className="whitespace-nowrap">
              <span className="text-accent tabular-nums">{n}</span> car-day{days === 1 ? "" : "s"}
            </span>{" "}
            a quarter
          </h1>
          <p className="mt-2 text-lg text-white/80">
            That&apos;s {n} day{days === 1 ? "" : "s"} families spent without their car.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{SHOP_NAME}&apos;s results</h1>
          <p className="mt-2 text-lg text-white/80">No jobs ran unusually long. Here&apos;s how your scorecard looks.</p>
        </>
      )}
    </section>
  );
}

function FixCard({ fix, rank }: { fix: Fix; rank: number }) {
  return (
    <li
      className="animate-enter flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5"
      style={{ animationDelay: `${(rank - 1) * 60}ms` }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-lg font-semibold [overflow-wrap:anywhere] text-ink">{fix.title}</h3>
          {fix.daysSaved > 0 && (
            <span className="text-sm font-semibold whitespace-nowrap text-success">
              saves ~{fix.daysSaved} day{fix.daysSaved === 1 ? "" : "s"} per car
            </span>
          )}
        </div>
        <p className="mt-1 text-slate-600">{fix.explanation}</p>
        {fix.basedOn && <p className="mt-2 text-xs [overflow-wrap:anywhere] text-slate-500">Based on: {fix.basedOn}</p>}
      </div>
    </li>
  );
}

function BeforeAfter({ cycle, fixes }: { cycle: ScoredMetric; fixes: Fix[] }) {
  const current = cycle.shopValue;
  if (!(current > 0)) return null;
  const saved = fixes.reduce((sum, f) => sum + f.daysSaved, 0);
  // Fixes overlap in practice, so never project more than halving cycle time.
  const projected = Math.round(Math.max(current * 0.5, current - saved) * 10) / 10;
  const scaleMax = Math.max(current, cycle.target) * 1.1;
  const rows = [
    { label: "Today", value: current, color: "bg-danger" },
    { label: "With these fixes (estimate)", value: projected, color: "bg-success" },
  ];

  return (
    <section className="animate-enter rounded-xl border border-slate-200 bg-white p-5 shadow-sm [animation-delay:180ms] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-primary">Before vs. after: cycle time</h2>
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-ink">Estimate</span>
      </div>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-600">{r.label}</span>
              <span className="shrink-0 font-semibold text-ink tabular-nums">{r.value.toFixed(1)} days</span>
            </div>
            {/* The target marker lives inside each track so it never crosses the labels. */}
            <div className="relative mt-1 h-4 rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / scaleMax) * 100}%` }} />
              <div
                className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-ink/60"
                style={{ left: `${(cycle.target / scaleMax) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-3 border-l-2 border-dashed border-ink/60" aria-hidden />
          Insurer target: {cycle.target} days
        </p>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        If all three fixes work, the average car could leave about{" "}
        <span className="font-semibold">{(current - projected).toFixed(1)} days sooner</span>. This is a rough
        estimate that adds up the fixes above. Real results depend on how well each change sticks.
      </p>
    </section>
  );
}

export default function ResultsPage() {
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [fixes, setFixes] = useState<FixesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadInputs();
      if (cancelled) return;
      setInputs(loaded);
      const result = await fetchFixes(loaded);
      if (!cancelled) setFixes(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!inputs) {
    return (
      <main className="px-safe pb-safe mx-auto max-w-5xl space-y-8 pt-10" aria-busy>
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-[30rem]" />
      </main>
    );
  }

  // Before/after needs a real cycle time; skip it if the scorecard didn't report one.
  const cycle = inputs.metrics.filter(isScored).find((m) => m.key === "cycle_time");
  const missingCount = inputs.metrics.filter((m) => !isScored(m)).length;

  return (
    <main className="px-safe pb-safe mx-auto max-w-5xl space-y-8 pt-10">
      <div className="animate-enter empty:hidden">
        <SampleNote sampleScores={inputs.sampleScores} sampleJobs={inputs.sampleJobs} />
      </div>
      <Banner jobs={inputs.jobs} />

      <section className="animate-enter rounded-xl border border-slate-200 bg-white p-4 shadow-sm [animation-delay:60ms] sm:p-6">
        <h2 className="text-xl font-bold text-primary">Scorecard at a glance</h2>
        <p className="mt-1 text-sm text-slate-600">
          Each score is out of 100. Anything inside the dashed line is below target.
          {missingCount > 0 &&
            ` ${missingCount} metric${missingCount === 1 ? " isn't" : "s aren't"} on your scorecard, so ${missingCount === 1 ? "it's" : "they're"} left out.`}
        </p>
        <ScoreRadar metrics={inputs.metrics} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-primary">Top 3 fixes to cut repair time</h2>
        {!fixes ? (
          <div className="mt-4 space-y-3">
            <Spinner label="Asking AI for your top fixes… about 10–20 seconds." />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {fixes.notice && (
              <div className="mt-4 animate-enter">
                <Notice kind="info">{fixes.notice}</Notice>
              </div>
            )}
            <ol className="mt-4 space-y-3">
              {fixes.fixes.map((f, i) => (
                <FixCard key={`${f.title}-${i}`} fix={f} rank={i + 1} />
              ))}
            </ol>
          </>
        )}
      </section>

      {cycle && fixes && <BeforeAfter cycle={cycle} fixes={fixes.fixes} />}
    </main>
  );
}
