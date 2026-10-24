"use client";

import { useState } from "react";
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

  const field = "w-full min-w-0 rounded-md border border-slate-300 px-2.5 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="text-slate-500">You ({UNIT_HINT[metric.unit]})</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoComplete="off" className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-slate-500">Target ({UNIT_HINT[metric.unit]})</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" autoComplete="off" className={field} />
        </label>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="submit" className="pressable rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
          Save
        </button>
        <button type="button" onClick={onCancel} className="pressable text-sm font-semibold text-slate-600">
          Cancel
        </button>
        {isScored(metric) && (
          <button type="button" onClick={() => onSave(applyEdit(metric, null))} className="pressable ml-auto text-xs text-slate-500 underline">
            Not on my scorecard
          </button>
        )}
      </div>
    </form>
  );
}

/** One metric's score card. With `onChange`, the shop owner can correct the numbers the AI read. */
export default function MetricCard({ metric, onChange }: { metric: Metric; onChange?: (m: Metric) => void }) {
  const [editing, setEditing] = useState(false);
  const status = metricStatus(metric);
  const style = STATUS_STYLES[status];

  const editLink = onChange && !editing && (
    <button type="button" onClick={() => setEditing(true)} className="pressable text-xs font-semibold text-primary hover:text-primary-hover">
      {isScored(metric) ? "Edit" : "Add values"}
    </button>
  );
  const form = editing && onChange && (
    <EditForm
      metric={metric}
      onCancel={() => setEditing(false)}
      onSave={(m) => {
        setEditing(false);
        onChange(m);
      }}
    />
  );
  const editedChip = metric.edited && (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary">Edited by you</span>
  );

  if (!isScored(metric)) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-semibold [overflow-wrap:anywhere] text-slate-500">{metric.label}</h3>
          {editLink}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.chip}`}>{style.label}</span>
          {editedChip}
        </div>
        {form || (
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            This wasn&apos;t on your scorecard (or couldn&apos;t be read clearly), so it isn&apos;t scored or counted in the chart.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {/* min-w-0 lets a long label wrap instead of pushing the score off the card */}
        <div className="min-w-0">
          <h3 className="font-semibold [overflow-wrap:anywhere] text-ink">{metric.label}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.chip}`}>{style.label}</span>
            {editedChip}
          </div>
        </div>
        <span className="shrink-0 text-2xl font-bold text-ink tabular-nums">{metric.score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${style.bar}`} style={{ width: `${metric.score}%` }} />
      </div>
      {form || (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-slate-500">You</dt>
                <dd className={`font-semibold ${status === "below" ? "text-danger" : "text-ink"}`}>{formatValue(metric.shopValue, metric.unit)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Target</dt>
                <dd className="font-semibold text-ink">{formatValue(metric.target, metric.unit)}</dd>
              </div>
            </dl>
            {editLink}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{metric.explanation}</p>
        </>
      )}
    </div>
  );
}
