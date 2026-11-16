"use client";

import { Fragment, useState } from "react";
import { formatValue } from "@/lib/format";
import { applyEdit, PLAUSIBLE, plausible } from "@/lib/scoring";
import { metricStatus, STATUS_STYLES } from "@/lib/status";
import { isScored, type Metric } from "@/lib/types";

const UNIT_HINT: Record<Metric["unit"], string> = { days: "days", "/100": "out of 100", $: "dollars", "%": "%" };

/** Inline form to correct (or add, or clear) a metric's value and target. */
function EditForm({ metric, onSave, onCancel }: { metric: Metric; onSave: (m: Metric) => void; onCancel: () => void }) {
  const [value, setValue] = useState(metric.shopValue?.toString() ?? "");
  const [target, setTarget] = useState(metric.target?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [min, max] = PLAUSIBLE[metric.unit];

  function save() {
    const v = Number(value.replace(/[$,%\s]/g, ""));
    const t = Number(target.replace(/[$,%\s]/g, ""));
    if (value.trim() === "" || target.trim() === "" || !plausible(v, metric.unit) || !plausible(t, metric.unit)) {
      setError(`Enter both numbers, between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")} ${UNIT_HINT[metric.unit]}.`);
      return;
    }
    onSave(applyEdit(metric, { shopValue: v, target: t }));
  }

  const field = "w-full min-w-0 rounded-md border border-white/20 bg-night px-2.5 py-2 text-base text-bone focus:border-gold focus:outline-none";
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid max-w-sm grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="text-muted">You ({UNIT_HINT[metric.unit]})</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoComplete="off" className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-muted">Target ({UNIT_HINT[metric.unit]})</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" autoComplete="off" className={field} />
        </label>
      </div>
      {error && <p className="text-xs text-danger-soft">{error}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" className="pressable rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-night hover:bg-bone">
          Save
        </button>
        <button type="button" onClick={onCancel} className="pressable text-sm font-semibold text-bone/70">
          Cancel
        </button>
        {isScored(metric) && (
          <button type="button" onClick={() => onSave(applyEdit(metric, null))} className="pressable text-xs text-muted underline">
            Not on my scorecard
          </button>
        )}
      </div>
    </form>
  );
}

/** Plain table of the scorecard: value, target and status for each metric, with an Edit link per row. */
export default function MetricTable({ metrics, onChange }: { metrics: Metric[]; onChange: (m: Metric) => void }) {
  const [editing, setEditing] = useState<Metric["key"] | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-night-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted uppercase">
            <th className="px-4 py-2.5 font-semibold">Metric</th>
            <th className="px-3 py-2.5 text-right font-semibold">You</th>
            <th className="px-3 py-2.5 text-right font-semibold">Target</th>
            <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Status</th>
            <th className="px-4 py-2.5">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const status = metricStatus(m);
            const style = STATUS_STYLES[status];
            return (
              <Fragment key={m.key}>
                <tr className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-bone">{m.label}</span>
                    {m.edited && <span className="ml-2 text-xs text-gold">edited</span>}
                    {/* Phones: status under the name instead of its own column. */}
                    <span className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-xs font-semibold sm:hidden ${style.chip}`}>{style.label}</span>
                  </td>
                  {isScored(m) ? (
                    <>
                      <td className={`px-3 py-3 text-right whitespace-nowrap tabular-nums ${status === "meets" ? "text-bone" : "font-semibold text-danger-soft"}`}>
                        {formatValue(m.shopValue, m.unit)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap text-bone/70 tabular-nums">{formatValue(m.target, m.unit)}</td>
                    </>
                  ) : (
                    <td colSpan={2} className="px-3 py-3 text-right text-muted">
                      —
                    </td>
                  )}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.chip}`}>{style.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setEditing(editing === m.key ? null : m.key)} className="pressable text-xs font-semibold text-gold hover:text-bone">
                      {isScored(m) ? "Edit" : "Add"}
                    </button>
                  </td>
                </tr>
                {editing === m.key && (
                  <tr className="border-b border-line bg-night">
                    <td colSpan={5} className="px-4 py-3">
                      <EditForm
                        metric={m}
                        onCancel={() => setEditing(null)}
                        onSave={(updated) => {
                          setEditing(null);
                          onChange(updated);
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
