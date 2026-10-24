import { formatValue } from "@/lib/format";
import { metricStatus, STATUS_STYLES } from "@/lib/status";
import type { Metric } from "@/lib/types";

export default function MetricCard({ metric }: { metric: Metric }) {
  const status = metricStatus(metric);
  const style = STATUS_STYLES[status];

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">{metric.label}</h3>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${style.chip}`}>
            {style.label}
          </span>
        </div>
        <span className="text-2xl font-bold text-ink tabular-nums">{metric.score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${style.bar}`} style={{ width: `${metric.score}%` }} />
      </div>
      <dl className="mt-3 flex gap-6 text-sm">
        <div>
          <dt className="text-slate-500">You</dt>
          <dd className={`font-semibold ${status === "below" ? "text-danger" : "text-ink"}`}>
            {formatValue(metric.shopValue, metric.unit)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Target</dt>
          <dd className="font-semibold text-ink">{formatValue(metric.target, metric.unit)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{metric.explanation}</p>
    </div>
  );
}
