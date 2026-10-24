import type { ScoredMetric } from "@/lib/types";

const SHORT: Record<ScoredMetric["key"], string> = {
  cycle_time: "Cycle",
  customer_satisfaction: "CSI",
  avg_repair_cost: "Cost",
  supplement_rate: "Supps",
  alt_parts_usage: "Parts",
  on_time_delivery: "On-time",
};
const TARGET_SCORE = 85;

/** Static SVG radar for the landing preview: no chart library, renders on the server. */
export default function RadarPreview({ metrics, size = 240 }: { metrics: ScoredMetric[]; size?: number }) {
  const c = size / 2;
  const r = size * 0.32;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / metrics.length;
  const point = (i: number, score: number) => {
    const d = (r * Math.max(0, Math.min(100, score))) / 100;
    return [c + d * Math.cos(angle(i)), c + d * Math.sin(angle(i))] as const;
  };
  const polygon = (scores: number[]) => scores.map((s, i) => point(i, s).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label="Radar chart of six scorecard scores">
      {[25, 50, 75, 100].map((ring) => (
        <polygon key={ring} points={polygon(metrics.map(() => ring))} fill="none" stroke="#e2e8f0" />
      ))}
      {metrics.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e2e8f0" />;
      })}
      <polygon points={polygon(metrics.map(() => TARGET_SCORE))} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" />
      <polygon
        points={polygon(metrics.map((m) => m.score))}
        fill="var(--color-accent)"
        fillOpacity={0.4}
        stroke="var(--color-primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {metrics.map((m, i) => {
        const [x, y] = point(i, m.score);
        return <circle key={m.key} cx={x} cy={y} r={3.5} fill="var(--color-primary)" stroke="#fff" strokeWidth={1.5} />;
      })}
      {metrics.map((m, i) => {
        const [x, y] = point(i, 128);
        const anchor = Math.abs(x - c) < 4 ? "middle" : x > c ? "start" : "end";
        return (
          <text key={m.key} x={x} y={y + 4} textAnchor={anchor} fontSize={11} fill="#475569">
            {SHORT[m.key]}
          </text>
        );
      })}
    </svg>
  );
}
