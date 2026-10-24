import { metricStatus } from "@/lib/status";
import { letterGrade, shopLevel, STAT_LABELS, TARGET_SCORE, weakestStat } from "@/lib/stats";
import { isScored, type Metric } from "@/lib/types";

// Chart geometry in viewBox units. The SVG scales to its container, so these stay fixed.
const W = 420;
const H = 372;
const CX = W / 2;
const CY = 188;
const R = 108; // radius of the 100-point ring
const LABEL_R = R + 22;
const MIN_AXES = 3; // a radar needs three axes to be a shape

// Theme tokens from app/globals.css (SVG attributes accept var()).
const STATUS_FILL = { meets: "var(--color-success)", close: "var(--color-warning)", below: "var(--color-danger)", missing: "#64748b" };

/** Splits long names onto two lines so side labels fit a phone-width chart ("Customer / Satisfaction"). */
const nameLines = (full: string) => (full.length > 11 && full.includes(" ") ? [full.slice(0, full.indexOf(" ")), full.slice(full.indexOf(" ") + 1)] : [full]);

/**
 * RPG-style "shop stat sheet": the insurer's target as a dashed shape and the shop's scores as a
 * filled red shape on a dark, cyan-gridded panel. Metrics missing from the scorecard are left off.
 */
export default function StatSheet({ metrics }: { metrics: Metric[] }) {
  const scored = metrics.filter(isScored);
  const level = shopLevel(metrics);
  const weakest = weakestStat(metrics);

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / scored.length;
  const at = (i: number, radius: number) => [CX + radius * Math.cos(angle(i)), CY + radius * Math.sin(angle(i))] as const;
  const shape = (scores: number[]) => scores.map((s, i) => at(i, (R * Math.max(0, Math.min(100, s))) / 100).join(",")).join(" ");

  return (
    <div className="overflow-hidden rounded-2xl bg-night-2 text-white ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Shop stat sheet</p>
        {level !== null && (
          <p className="rounded-md bg-accent/15 px-2.5 py-1 font-mono text-sm font-bold text-accent ring-1 ring-accent/40">
            Level {level} · Grade {letterGrade(level)}
          </p>
        )}
      </div>
      {weakest && (
        <p className="px-4 pt-3 text-sm text-white/80 sm:px-5">
          <span className="font-semibold text-white">Weakest stat:</span>{" "}
          <span className="font-mono font-bold text-danger-soft">{STAT_LABELS[weakest.metric.key].short}</span>
          {weakest.text.slice(STAT_LABELS[weakest.metric.key].short.length)}
        </p>
      )}

      {scored.length < MIN_AXES ? (
        <p className="px-5 py-12 text-center text-sm text-white/70">
          Only {scored.length} of the six metrics {scored.length === 1 ? "was" : "were"} on this scorecard, which isn&apos;t
          enough to draw a chart.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mx-auto block h-auto w-full max-w-[480px]"
            role="img"
            aria-label={`Stat sheet: ${scored.map((m) => `${STAT_LABELS[m.key].full} ${m.score}`).join(", ")}. Target is ${TARGET_SCORE} on every stat.`}
          >
            <defs>
              <radialGradient id="stat-glow">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r={R * 1.15} fill="url(#stat-glow)" />

            {/* Grid: rings every 25 points and a spoke per stat, in the accent color. */}
            {[25, 50, 75, 100].map((ring) => (
              <polygon
                key={ring}
                points={shape(scored.map(() => ring))}
                fill="none"
                stroke="var(--color-accent)"
                strokeOpacity={ring === 100 ? 0.5 : 0.22}
                strokeWidth={ring === 100 ? 1.5 : 1}
              />
            ))}
            {scored.map((m, i) => {
              const [x, y] = at(i, R);
              return <line key={m.key} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-accent)" strokeOpacity={0.28} />;
            })}

            {/* Insurer target: the shape the shop needs to fill. */}
            <polygon
              points={shape(scored.map(() => TARGET_SCORE))}
              fill="none"
              stroke="#e2e8f0"
              strokeOpacity={0.85}
              strokeWidth={2}
              strokeDasharray="6 5"
            />

            {/* Shop: grows out from the center when it appears (fade only under reduced motion). */}
            <g className="animate-grow" style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: "view-box" }}>
              <polygon
                points={shape(scored.map((m) => m.score))}
                fill="var(--color-danger)"
                fillOpacity={0.38}
                stroke="var(--color-danger)"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              {scored.map((m, i) => {
                const [x, y] = at(i, (R * m.score) / 100);
                return <circle key={m.key} cx={x} cy={y} r={4.5} fill={STATUS_FILL[metricStatus(m)]} stroke="#141416" strokeWidth={2} />;
              })}
            </g>

            {/* Labels: game abbreviation and score, with the full name underneath. */}
            {scored.map((m, i) => {
              const [x, y] = at(i, LABEL_R);
              const cos = Math.cos(angle(i));
              const sin = Math.sin(angle(i));
              const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
              const lines = nameLines(STAT_LABELS[m.key].full);
              const blockHeight = 18 + lines.length * 14;
              // Top labels sit above the chart, bottom labels below it, side labels centered on the spoke.
              const top = sin < -0.5 ? y - blockHeight + 6 : sin > 0.5 ? y + 8 : y - blockHeight / 2 + 6;
              const status = metricStatus(m);
              return (
                <text key={m.key} x={x} y={top} textAnchor={anchor}>
                  <tspan x={x} dy={10} fontSize={16} fontWeight={700} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#ffffff">
                    {STAT_LABELS[m.key].short}{" "}
                    <tspan fill={status === "meets" ? "var(--color-success)" : status === "close" ? "var(--color-warning)" : "#f87171"}>{m.score}</tspan>
                  </tspan>
                  {lines.map((line) => (
                    <tspan key={line} x={x} dy={14} fontSize={12} fill="#94a3b8">
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </svg>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 pb-4 text-xs text-white/70">
            <span className="flex items-center gap-2">
              <span aria-hidden className="w-5 border-t-2 border-dashed border-line/85" /> Insurer target
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-3 w-3 rounded-sm border-2 border-danger bg-danger/40" /> Your shop
            </span>
          </div>
        </>
      )}
    </div>
  );
}
