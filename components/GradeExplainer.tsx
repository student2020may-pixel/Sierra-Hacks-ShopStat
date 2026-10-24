import { formatValue } from "@/lib/format";
import { STAT_LABELS } from "@/lib/stats";
import { isScored, type Metric } from "@/lib/types";

/** A worked example from the shop's own numbers: the worst miss, or failing that any scored metric. */
function example(metrics: Metric[]): string | null {
  const scored = metrics.filter(isScored);
  const pick = [...scored].sort((a, b) => a.score - b.score)[0];
  if (!pick) return null;
  const base = Math.abs(pick.target) || 1;
  const off = Math.round((Math.abs(pick.shopValue - pick.target) / base) * 100);
  const ahead = pick.higherIsBetter ? pick.shopValue >= pick.target : pick.shopValue <= pick.target;
  const name = STAT_LABELS[pick.key].full.toLowerCase();
  return `Your ${name} is ${formatValue(pick.shopValue, pick.unit)} against a target of ${formatValue(pick.target, pick.unit)}. That's ${off}% ${ahead ? "better than" : "off"} target, so it scores ${pick.score}.`;
}

/** Collapsible plain-English version of lib/scoring.ts and the shop level. */
export default function GradeExplainer({ metrics }: { metrics: Metric[] }) {
  const eg = example(metrics);
  return (
    <details className="group rounded-xl border border-line bg-night-2">
      <summary className="pressable flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-gold [&::-webkit-details-marker]:hidden">
        How your grade is calculated
        <svg aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-bone/85">
        <p>We compare each number on your scorecard with your insurer&apos;s target. The score is worked out by a fixed formula, not by the AI, so the same numbers always get the same score.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold">Exactly on target scores 85.</span> Beating it adds up to 15 more points; 20% better than target or more scores 100.
          </li>
          <li>
            <span className="font-semibold">Missing the target costs points</span> the further off you are: about 70 at 10% off, 40 at 30% off, and 10 at 60% off.
          </li>
          <li>For cycle time, repair cost, and supplement rate, lower is better. For satisfaction, alternate parts, and on-time delivery, higher is better.</li>
          <li>
            <span className="font-semibold">Your shop level</span> is the average of those scores. Metrics that aren&apos;t on your scorecard don&apos;t count. Grades: A is 90+, B 80+, C 70+, D 60+, F below 60.
          </li>
        </ul>
        {eg && <p className="rounded-lg bg-night px-3 py-2 text-bone/70">Example: {eg}</p>}
      </div>
    </details>
  );
}
