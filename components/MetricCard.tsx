import { formatValue, meetsTarget } from "@/lib/format";
import type { Metric } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 85) return { bar: "bg-green-500", text: "text-green-700" };
  if (score >= 65) return { bar: "bg-amber-500", text: "text-amber-700" };
  return { bar: "bg-red-500", text: "text-red-700" };
}

export default function MetricCard({ metric }: { metric: Metric }) {
  const ok = meetsTarget(metric);
  const color = scoreColor(metric.score);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{metric.label}</h3>
        <span className={`text-2xl font-bold tabular-nums ${color.text}`}>{metric.score}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color.bar}`} style={{ width: `${metric.score}%` }} />
      </div>
      <dl className="mt-3 flex gap-6 text-sm">
        <div>
          <dt className="text-slate-500">You</dt>
          <dd className={`font-semibold ${ok ? "text-slate-900" : "text-red-700"}`}>
            {formatValue(metric.shopValue, metric.unit)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Target</dt>
          <dd className="font-semibold text-slate-900">{formatValue(metric.target, metric.unit)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{metric.explanation}</p>
    </div>
  );
}
