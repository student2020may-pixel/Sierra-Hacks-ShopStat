"use client";

import { Fragment, useState } from "react";
import { formatValue } from "@/lib/format";
import { applyEdit, PLAUSIBLE, plausible } from "@/lib/scoring";
import { kpiStatus, STATUS_STYLES } from "@/lib/status";
import { isScored, type Kpi, type KpiUnit } from "@/lib/types";

const UNIT_HINT: Record<KpiUnit, string> = { days: "days", "/100": "out of 100", $: "dollars", "%": "%", hours: "hours", number: "number" };

/** Inline form to correct (or add, or clear) a KPI's value and target. */
function EditForm({ kpi, onSave, onCancel }: { kpi: Kpi; onSave: (k: Kpi) => void; onCancel: () => void }) {
  const [value, setValue] = useState(kpi.value?.toString() ?? "");
  const [target, setTarget] = useState(kpi.target?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [min, max] = PLAUSIBLE[kpi.unit];

  function save() {
    const v = Number(value.replace(/[$,%\s]/g, ""));
    const t = Number(target.replace(/[$,%\s]/g, ""));
    if (value.trim() === "" || target.trim() === "" || !plausible(v, kpi.unit) || !plausible(t, kpi.unit)) {
      setError(`Enter both numbers, between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")} ${UNIT_HINT[kpi.unit]}.`);
      return;
    }
    onSave(applyEdit(kpi, { value: v, target: t }));
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
          <span className="text-muted">You ({UNIT_HINT[kpi.unit]})</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoComplete="off" className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-muted">Target ({UNIT_HINT[kpi.unit]})</span>
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
        {isScored(kpi) && (
          <button type="button" onClick={() => onSave(applyEdit(kpi, null))} className="pressable text-xs text-muted underline">
            Clear numbers
          </button>
        )}
      </div>
    </form>
  );
}

/** Plain table of one insurer's KPIs: value, target and status, with an Edit (or Add) link per row. */
export default function KpiTable({ kpis, onChange }: { kpis: Kpi[]; onChange: (k: Kpi) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-night-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted uppercase">
            <th className="px-4 py-2.5 font-semibold">KPI</th>
            <th className="px-3 py-2.5 text-right font-semibold">You</th>
            <th className="px-3 py-2.5 text-right font-semibold">Target</th>
            <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Status</th>
            <th className="px-4 py-2.5">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((k, i) => {
            const status = kpiStatus(k);
            const style = STATUS_STYLES[status];
            // One of the two numbers is in: the KPI is in use, it just can't be judged yet.
            const label = status === "missing" && (k.value !== null || k.target !== null) ? (k.target === null ? "No target" : "No value") : style.label;
            return (
              <Fragment key={`${k.label}-${i}`}>
                <tr className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium [overflow-wrap:anywhere] text-bone">{k.label}</span>
                    {k.edited && <span className="ml-2 text-xs text-gold">edited</span>}
                    {k.category && <span className="mt-0.5 block text-xs text-gold/80">{k.category}</span>}
                    {!k.confirmed && (
                      <span className="mt-0.5 block text-xs text-muted" title="The unit or which way is better is our guess from the KPI name.">
                        unconfirmed
                      </span>
                    )}
                    {/* Phones: status under the name instead of its own column. */}
                    <span className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-xs font-semibold sm:hidden ${style.chip}`}>{label}</span>
                  </td>
                  <td className={`px-3 py-3 text-right whitespace-nowrap tabular-nums ${status === "close" || status === "below" ? "font-semibold text-danger-soft" : "text-bone"}`}>
                    {k.value === null ? "—" : formatValue(k.value, k.unit)}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap text-bone/70 tabular-nums">{k.target === null ? "—" : formatValue(k.target, k.unit)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.chip}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setEditing(editing === i ? null : i)} className="pressable text-xs font-semibold text-gold hover:text-bone">
                      {k.value === null && k.target === null ? "Add" : "Edit"}
                    </button>
                  </td>
                </tr>
                {editing === i && (
                  <tr className="border-b border-line bg-night">
                    <td colSpan={5} className="px-4 py-3">
                      <EditForm
                        kpi={k}
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
