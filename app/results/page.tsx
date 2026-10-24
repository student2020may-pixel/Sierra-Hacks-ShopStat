"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import Notice from "@/components/Notice";
import Spinner from "@/components/Spinner";
import sampleFixes from "@/data/sample-fixes.json";
import scorecardData from "@/data/scorecard.json";
import { detectOutliers, type AnomalyResult } from "@/lib/anomaly";
import { parseJobsCsv } from "@/lib/csv";
import { JOBS_KEY, load, SCORE_KEY } from "@/lib/storage";
import type { Fix, FixesRequest, FixesResponse, Metric, Scorecard, ScoreResponse } from "@/lib/types";

const ScoreRadar = dynamic(() => import("@/components/ScoreRadar"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center">
      <Spinner label="Drawing chart…" />
    </div>
  ),
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
  const score = load<ScoreResponse>(SCORE_KEY);
  let jobs = load<AnomalyResult>(JOBS_KEY);
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data?.fixes) && data.fixes.length) return data as FixesResponse;
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
        <Link href="/upload" className="font-semibold underline">
          Upload your scorecard
        </Link>
      )}
      {sampleScores && sampleJobs && " · "}
      {sampleJobs && (
        <Link href="/jobs" className="font-semibold underline">
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
  return (
    <section className="rounded-2xl bg-primary px-6 py-8 text-white sm:px-10">
      {days > 0 ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {SHOP_NAME} is losing <span className="text-accent">{days}</span> car-days a quarter
          </h1>
          <p className="mt-2 text-lg text-white/80">
            That&apos;s {days} days families spent without their car.
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
    <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-lg font-semibold text-ink">{fix.title}</h3>
          <span className="text-sm font-semibold whitespace-nowrap text-success">
            saves ~{fix.daysSaved} day{fix.daysSaved === 1 ? "" : "s"} per car
          </span>
        </div>
        <p className="mt-1 text-slate-600">{fix.explanation}</p>
        <p className="mt-2 text-xs text-slate-500">Based on: {fix.basedOn}</p>
      </div>
    </li>
  );
}

function BeforeAfter({ cycle, fixes }: { cycle: Metric; fixes: Fix[] }) {
  const current = cycle.shopValue;
  const saved = fixes.reduce((sum, f) => sum + f.daysSaved, 0);
  // Fixes overlap in practice, so never project more than halving cycle time.
  const projected = Math.round(Math.max(current * 0.5, current - saved) * 10) / 10;
  const scaleMax = Math.max(current, cycle.target) * 1.1;
  const rows = [
    { label: "Today", value: current, color: "bg-danger" },
    { label: "With these fixes (estimate)", value: projected, color: "bg-success" },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-primary">Before vs. after: cycle time</h2>
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-ink">Estimate</span>
      </div>
      <div className="relative mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{r.label}</span>
              <span className="font-semibold text-ink tabular-nums">{r.value.toFixed(1)} days</span>
            </div>
            <div className="mt-1 h-4 rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / scaleMax) * 100}%` }} />
            </div>
          </div>
        ))}
        <div
          className="pointer-events-none absolute top-0 bottom-0 border-l-2 border-dashed border-slate-500"
          style={{ left: `${(cycle.target / scaleMax) * 100}%` }}
        >
          <span className="absolute -top-5 -translate-x-1/2 text-xs whitespace-nowrap text-slate-600">
            Target {cycle.target}
          </span>
        </div>
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
      <main className="mx-auto flex max-w-5xl justify-center px-4 py-24">
        <Spinner label="Loading your results…" />
      </main>
    );
  }

  const cycle = inputs.metrics.find((m) => m.key === "cycle_time");

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <SampleNote sampleScores={inputs.sampleScores} sampleJobs={inputs.sampleJobs} />
      <Banner jobs={inputs.jobs} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-primary">Scorecard at a glance</h2>
        <p className="mt-1 text-sm text-slate-600">Each score is out of 100. Anything inside the dashed line is below target.</p>
        <ScoreRadar metrics={inputs.metrics} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-primary">Top 3 fixes to cut repair time</h2>
        {!fixes ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
            <Spinner label="Asking AI for your top fixes… this takes about 10–20 seconds." />
          </div>
        ) : (
          <>
            {fixes.notice && (
              <div className="mt-4">
                <Notice kind="info">{fixes.notice}</Notice>
              </div>
            )}
            <ol className="mt-4 space-y-3">
              {fixes.fixes.map((f, i) => (
                <FixCard key={f.title} fix={f} rank={i + 1} />
              ))}
            </ol>
          </>
        )}
      </section>

      {cycle && fixes && <BeforeAfter cycle={cycle} fixes={fixes.fixes} />}
    </main>
  );
}
