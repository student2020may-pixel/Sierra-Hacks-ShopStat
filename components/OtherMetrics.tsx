import { formatOther } from "@/lib/format";
import type { OtherMetric } from "@/lib/types";

/** Extra metrics the scorecard reported beyond our six. Informational only: not scored or charted. */
export default function OtherMetrics({ metrics }: { metrics: OtherMetric[] }) {
  if (metrics.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl font-normal text-bone">Also found on your scorecard</h2>
      <p className="mt-1 text-sm text-bone/70">Not part of the six scores above, but worth knowing.</p>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-night-2 ">
        {metrics.map((m, i) => (
          <li
            key={`${m.label}-${i}`}
            className="animate-enter px-4 py-3 text-sm"
            style={{ animationDelay: `${300 + i * 40}ms` }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <p className="min-w-0 font-semibold [overflow-wrap:anywhere] text-bone">{m.label}</p>
              {m.value !== null && (
                <p className="min-w-0 [overflow-wrap:anywhere] text-bone/85 tabular-nums">
                  <span className="font-semibold text-bone">{formatOther(m.value, m.unit)}</span>
                  {m.target !== null && <span className="text-muted"> · target {formatOther(m.target, m.unit)}</span>}
                </p>
              )}
            </div>
            {m.note && <p className="mt-0.5 text-bone/70">{m.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
