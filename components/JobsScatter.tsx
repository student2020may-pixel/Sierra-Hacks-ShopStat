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

/**
 * Label side per outlier: right by default, left when the label would collide with a
 * neighbor's. Walks from the largest job down so the left-most of a crowded pair goes left.
 */
function labelSides(outliers: ScoredJob[]): Map<string, "left" | "right"> {
  const sides = new Map<string, "left" | "right">();
  const byHoursDesc = [...outliers].sort((a, b) => b.laborHours - a.laborHours);
  byHoursDesc.forEach((job, i) => {
    const crowded = byHoursDesc
      .slice(0, i)
      .some(
        (o) =>
          sides.get(o.jobId) === "right" &&
          Math.abs(o.laborHours - job.laborHours) < 6 &&
          Math.abs(o.daysInShop - job.daysInShop) < 3,
      );
    sides.set(job.jobId, crowded ? "left" : "right");
  });
  return sides;
}

export default function JobsScatter({ result }: { result: AnomalyResult }) {
  const normal = result.jobs.filter((j) => !j.isOutlier);
  const outliers = result.jobs.filter((j) => j.isOutlier);
  const sides = labelSides(outliers);
  const maxHours = Math.ceil(Math.max(...result.jobs.map((j) => j.laborHours)) / 5) * 5;
  const { baseDays, daysPerLaborHour } = result.fit;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 60, bottom: 30, left: 0 }}>
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
            <LabelList
              dataKey="jobId"
              content={({ x, y, value }) => {
                const left = sides.get(String(value)) === "left";
                return (
                  <text
                    x={Number(x) + (left ? -6 : 18)}
                    y={Number(y) + 9}
                    textAnchor={left ? "end" : "start"}
                    fill="#334155"
                    fontSize={11}
                  >
                    {value}
                  </text>
                );
              }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="-mt-2 text-center text-xs text-slate-500">Dashed line: expected days for a job of that size</p>
    </div>
  );
}
