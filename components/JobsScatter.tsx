"use client";

import {
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { AnomalyResult, ScoredJob } from "@/lib/anomaly";

// Theme tokens from app/globals.css.
const NORMAL = "var(--color-primary)";
const OUTLIER = "var(--color-danger)";
const INK_MUTED = "#64748b"; // slate-500

function JobTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScoredJob }[] }) {
  const job = payload?.[0]?.payload;
  if (!active || !job) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-md">
      <p className="font-semibold text-ink">
        {job.jobId}
        {job.isOutlier && <span className="ml-2 font-bold text-danger">Outlier</span>}
      </p>
      <p>{job.laborHours} labor hours</p>
      <p>
        {job.daysInShop} days in shop (expected {job.expectedDays})
      </p>
    </div>
  );
}

/** Job IDs differ at the end (RO-2026-0003481-SUPPLEMENT-2), so shorten them in the middle. */
function shortId(id: string, max = 14): string {
  return id.length <= max ? id : `${id.slice(0, 6)}…${id.slice(-(max - 7))}`;
}

type LabelSpot = { side: "left" | "right"; below: boolean };

/** Approximate plot height and label line height in px, used to tell when two labels would overlap. */
const PLOT_HEIGHT_PX = 210;
const LABEL_LINE_PX = 14;

/**
 * Label placement per outlier, aligned with the outliers array. Each label takes the first spot
 * that doesn't overlap a label already placed: right, left, then the same sides one line lower.
 * Labels near the right edge never go right, near the left edge (the y-axis) never left. With no
 * free spot the label is skipped; the table below lists every job. Walks from the largest job
 * down so the left-most of a crowded pair goes left.
 */
function labelSpots(outliers: ScoredJob[], maxHours: number, maxDays: number): (LabelSpot | null)[] {
  const spots: (LabelSpot | null)[] = new Array(outliers.length);
  const order = outliers.map((_, i) => i).sort((a, b) => outliers[b].laborHours - outliers[a].laborHours);
  const labelY = (job: ScoredJob, spot: LabelSpot) =>
    (-job.daysInShop * PLOT_HEIGHT_PX) / maxDays + (spot.below ? LABEL_LINE_PX : 0);
  order.forEach((idx, n) => {
    const job = outliers[idx];
    const nearRight = job.laborHours > maxHours * 0.7;
    const nearLeft = job.laborHours < maxHours * 0.4;
    const candidates = (
      [
        { side: "right", below: false },
        { side: "left", below: false },
        { side: "left", below: true },
        { side: "right", below: true },
      ] as LabelSpot[]
    ).filter((c) => !(nearRight && c.side === "right") && !(nearLeft && c.side === "left"));
    const overlaps = (c: LabelSpot) =>
      order.slice(0, n).some((o) => {
        const other = spots[o];
        return (
          other !== null &&
          other.side === c.side &&
          Math.abs(outliers[o].laborHours - job.laborHours) < maxHours * 0.3 &&
          Math.abs(labelY(outliers[o], other) - labelY(job, c)) < LABEL_LINE_PX - 1
        );
      });
    spots[idx] = candidates.find((c) => !overlaps(c)) ?? null;
  });
  return spots;
}

export default function JobsScatter({ result }: { result: AnomalyResult }) {
  const normal = result.jobs.filter((j) => !j.isOutlier);
  const outliers = result.jobs.filter((j) => j.isOutlier);
  const maxHours = Math.ceil(Math.max(...result.jobs.map((j) => j.laborHours)) / 5) * 5;
  const maxDays = Math.max(...result.jobs.map((j) => j.daysInShop), 1) * 1.05;
  const spots = labelSpots(outliers, maxHours, maxDays);
  // Past a few dozen outliers, labels turn into noise; the table below lists them all.
  const showLabels = outliers.length <= 12;
  const { baseDays, daysPerLaborHour } = result.fit;

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 30, left: -8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="laborHours"
            domain={[0, maxHours]}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Estimated labor hours", position: "insideBottom", offset: -18, fill: INK_MUTED, fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="daysInShop"
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Days in shop", angle: -90, position: "insideLeft", offset: 15, fill: INK_MUTED, fontSize: 12 }}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: baseDays },
              { x: maxHours, y: baseDays + daysPerLaborHour * maxHours },
            ]}
            stroke="#94a3b8"
            strokeDasharray="6 4"
            strokeWidth={2}
            ifOverflow="extendDomain"
          />
          <ZAxis range={[90, 90]} />
          <Tooltip content={<JobTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            formatter={(value) => <span style={{ color: "#334155" }}>{value}</span>}
          />
          <Scatter name="Normal jobs" data={normal} fill={NORMAL} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
          <Scatter name="Outliers" data={outliers} fill={OUTLIER} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
            {showLabels && <LabelList
              dataKey="jobId"
              content={({ x, y, value, index }) => {
                const spot = spots[index ?? 0];
                if (!spot) return null;
                const left = spot.side === "left";
                return (
                  <text
                    x={Number(x) + (left ? -6 : 18)}
                    y={Number(y) + 9 + (spot.below ? 14 : 0)}
                    textAnchor={left ? "end" : "start"}
                    fill="#334155"
                    fontSize={11}
                  >
                    {shortId(String(value))}
                  </text>
                );
              }}
            />}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="-mt-2 text-center text-xs text-slate-500">Dashed line: expected days for a job of that size</p>
    </div>
  );
}
