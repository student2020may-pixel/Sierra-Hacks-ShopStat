"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Metric, MetricKey } from "@/lib/types";

const SHORT_LABELS: Record<MetricKey, string> = {
  cycle_time: "Cycle time",
  customer_satisfaction: "Satisfaction",
  avg_repair_cost: "Repair cost",
  supplement_rate: "Supplements",
  alt_parts_usage: "Alt. parts",
  on_time_delivery: "On-time",
};

/** Score a metric gets for just meeting its target (see the scoring rubric in /api/score). */
const TARGET_SCORE = 85;
const SHOP = "#3b82f6"; // blue-500

export default function ScoreRadar({ metrics }: { metrics: Metric[] }) {
  const data = metrics.map((m) => ({ metric: SHORT_LABELS[m.key], score: m.score, target: TARGET_SCORE }));

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="78%" margin={{ top: 10, right: 40, bottom: 0, left: 40 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#334155", fontSize: 12 }} />
          {/* Scale is fixed at 0–100; tick labels are hidden because they collide with the top axis label. */}
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Meets target"
            dataKey="target"
            stroke="#94a3b8"
            strokeDasharray="6 4"
            strokeWidth={2}
            fill="none"
            isAnimationActive={false}
          />
          <Radar
            name="Your score"
            dataKey="score"
            stroke={SHOP}
            strokeWidth={2}
            fill={SHOP}
            fillOpacity={0.25}
            dot={{ r: 4, fill: SHOP, stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Tooltip formatter={(value) => [`${value} / 100`]} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: "#334155" }}>{value}</span>}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
