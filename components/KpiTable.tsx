import { formatValue, formatVariance } from "@/lib/format";
import { STAT_LABELS } from "@/lib/stats";
import { metricStatus, STATUS_STYLES, type Status } from "@/lib/status";
import { GENERAL_TIPS } from "@/lib/tips";
import { isScored, type Fix, type Metric, type MetricKey } from "@/lib/types";

const DOT: Record<Status, string> = { meets: "bg-success", close: "bg-warning", below: "bg-danger", missing: "bg-slate-300" };
const HIGHLIGHTED = 3;

interface Props {
  metrics: Metric[];
  /** null while the AI fixes are still loading. */
  fixes: Fix[] | null;
  period: string | null;
  jobCount: number | null;
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[status]}`} />
      <span className="text-xs text-slate-600">{STATUS_STYLES[status].label}</span>
    </span>
  );
}

/**
 * Pairs each weak metric (weakest first) with a fix that targets it, preferring fixes not already
 * shown, so the same advice doesn't repeat down the table when another fix also applies.
 */
function assignFixes(weakest: MetricKey[], fixes: Fix[]): Map<MetricKey, Fix> {
  const assigned = new Map<MetricKey, Fix>();
  const used = new Set<Fix>();
  for (const key of weakest) {
    const candidates = fixes.filter((f) => f.metrics?.includes(key));
    const fix = candidates.find((f) => !used.has(f)) ?? candidates[0];
    if (fix) {
      assigned.set(key, fix);
      used.add(fix);
    }
  }
  return assigned;
}

function FixNote({ metricKey, fixes, fix }: { metricKey: MetricKey; fixes: Fix[] | null; fix: Fix | undefined }) {
  if (fixes === null) return <span className="text-slate-400">Finding a fix…</span>;
  if (!fix) {
    return (
      <>
        <span className="font-semibold text-ink">General tip:</span> {GENERAL_TIPS[metricKey]}
      </>
    );
  }
  return (
    <>
      <span className="font-semibold text-ink">Recommended fix: {fix.title}.</span> {fix.explanation}
      {fix.daysSaved > 0 && <span className="whitespace-nowrap text-success"> Saves ~{fix.daysSaved} days per car (estimate).</span>}
    </>
  );
}

/**
 * Every metric with value, target, variance, and status. The three weakest metrics that miss their
 * target are highlighted with the fix that targets them (or a labeled general tip if none does).
 */
export default function KpiTable({ metrics, fixes, period, jobCount }: Props) {
  const weakestInOrder = metrics
    .filter(isScored)
    .filter((m) => metricStatus(m) !== "meets")
    .sort((a, b) => a.score - b.score)
    .slice(0, HIGHLIGHTED)
    .map((m) => m.key);
  const weakest = new Set(weakestInOrder);
  const fixFor = fixes ? assignFixes(weakestInOrder, fixes) : new Map<MetricKey, Fix>();

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 pt-4 sm:px-6 sm:pt-5">
        <h2 className="text-xl font-bold text-primary">Scorecard details</h2>
        <p className="text-sm text-slate-600">
          Reporting period: <span className="font-semibold text-ink">{period ?? "not shown on scorecard"}</span>
          {jobCount !== null && (
            <>
              {" · "}
              <span className="font-semibold text-ink tabular-nums">{jobCount.toLocaleString("en-US")}</span> jobs analyzed
            </>
          )}
        </p>
      </div>
      {weakest.size > 0 && (
        <p className="px-4 pt-1 text-xs text-slate-500 sm:px-6">
          Highlighted: your {weakest.size === 1 ? "weakest metric" : `${weakest.size} weakest metrics`}, with what to do about each.
        </p>
      )}

      {/* Phones: one card per metric, so no number gets pushed off screen. */}
      <ul className="mt-3 divide-y divide-slate-100 sm:hidden">
        {metrics.map((m) => {
          const status = metricStatus(m);
          const weak = weakest.has(m.key);
          return (
            <li key={m.key} className={`px-4 py-3 ${weak ? "border-l-4 border-danger bg-danger/5" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-semibold text-ink">
                  {STAT_LABELS[m.key].full} <span className="font-mono text-xs text-slate-500">{STAT_LABELS[m.key].short}</span>
                </p>
                <StatusDot status={status} />
              </div>
              {isScored(m) ? (
                <p className="mt-1 text-sm text-slate-600 tabular-nums">
                  {formatValue(m.shopValue, m.unit)} vs {formatValue(m.target, m.unit)} ·{" "}
                  <span className={status === "meets" ? "" : "font-semibold text-danger"}>{formatVariance(m.shopValue, m.target, m.unit)}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-400">Not on this scorecard</p>
              )}
              {weak && (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  <FixNote metricKey={m.key} fixes={fixes} fix={fixFor.get(m.key)} />
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Wider screens: a real table. */}
      <div className="mt-3 hidden overflow-x-auto pb-2 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-page text-left text-xs text-slate-500 uppercase">
              <th className="px-6 py-2.5 font-semibold">Metric</th>
              <th className="px-4 py-2.5 text-right font-semibold">Your shop</th>
              <th className="px-4 py-2.5 text-right font-semibold">Insurer target</th>
              <th className="px-4 py-2.5 text-right font-semibold">Variance</th>
              <th className="px-6 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const status = metricStatus(m);
              const weak = weakest.has(m.key);
              const rowTint = weak ? "bg-danger/5" : "";
              return [
                <tr key={m.key} className={`${rowTint} ${weak ? "" : "border-b border-slate-100"}`}>
                  <td className={`px-6 py-3 ${weak ? "border-l-4 border-danger pl-5" : ""}`}>
                    <span className="font-semibold text-ink">{STAT_LABELS[m.key].full}</span>{" "}
                    <span className="font-mono text-xs text-slate-500">{STAT_LABELS[m.key].short}</span>
                  </td>
                  {isScored(m) ? (
                    <>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-ink tabular-nums">{formatValue(m.shopValue, m.unit)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 tabular-nums">{formatValue(m.target, m.unit)}</td>
                      <td className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${status === "meets" ? "text-slate-600" : "font-semibold text-danger"}`}>
                        {formatVariance(m.shopValue, m.target, m.unit)}
                      </td>
                    </>
                  ) : (
                    <td colSpan={3} className="px-4 py-3 text-right text-slate-400">
                      Not on this scorecard
                    </td>
                  )}
                  <td className="px-6 py-3">
                    <StatusDot status={status} />
                  </td>
                </tr>,
                weak && (
                  <tr key={`${m.key}-fix`} className={`${rowTint} border-b border-slate-100`}>
                    <td colSpan={5} className="border-l-4 border-danger px-5 pb-3 leading-relaxed text-slate-700">
                      <FixNote metricKey={m.key} fixes={fixes} fix={fixFor.get(m.key)} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
