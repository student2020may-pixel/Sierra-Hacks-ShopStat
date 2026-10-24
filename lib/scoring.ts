/**
 * Fixed 0–100 score for one metric, computed from the shop's value and the insurer's target.
 *
 * First we measure how far the shop is from target as a fraction of the target, in the direction
 * that matters (for lower-is-better metrics like cycle time, being above target is a miss).
 *
 * - Meets or beats target: 85, plus up to 15 more points scaled by how far past target
 *   (20% better than target or more = 100).
 * - Misses target: the score drops with the percentage miss along straight lines between
 *   0% → 84, 10% → 70, 30% → 40, 60% → 10, and 120% or worse → 0.
 *
 * Example: cycle time 11.8 days vs a 7.5-day target is a 57% miss → 13.
 */

import type { MetricUnit } from "./schemas";

const BEAT_FOR_FULL_MARKS = 0.2;

/**
 * Values outside these ranges can't be real (a 142% rate, a 1,284-day cycle time), so they're
 * treated as a misread (from the AI) or a typo (from the edit form) rather than scored.
 */
export const PLAUSIBLE: Record<MetricUnit, [number, number]> = {
  "%": [0, 100],
  "/100": [0, 100],
  days: [0, 365],
  $: [0, 100_000],
};
export const plausible = (v: number, unit: MetricUnit) =>
  Number.isFinite(v) && v >= PLAUSIBLE[unit][0] && v <= PLAUSIBLE[unit][1];

/** [miss fraction, score] points the miss curve passes through. */
const MISS_CURVE: [number, number][] = [
  [0, 84],
  [0.1, 70],
  [0.3, 40],
  [0.6, 10],
  [1.2, 0],
];

export function scoreMetric(value: number, target: number, higherIsBetter: boolean): number {
  // How far past (+) or short of (−) target, relative to the target's size.
  const base = Math.abs(target) || 1;
  const ahead = (higherIsBetter ? value - target : target - value) / base;

  if (ahead >= 0) {
    return Math.round(85 + 15 * Math.min(1, ahead / BEAT_FOR_FULL_MARKS));
  }

  const miss = -ahead;
  for (let i = 1; i < MISS_CURVE.length; i++) {
    const [x0, y0] = MISS_CURVE[i - 1];
    const [x1, y1] = MISS_CURVE[i];
    if (miss <= x1) return Math.round(y0 + ((miss - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 0;
}

/**
 * Applies a hand correction to one metric: rescored with the formula above, or marked "not on this
 * scorecard" when cleared. The AI's explanation described the old numbers, so it's replaced.
 */
export function applyEdit<M extends { unit: MetricUnit; higherIsBetter: boolean }>(
  metric: M,
  edit: { shopValue: number; target: number } | null,
): M & { shopValue: number | null; target: number | null; score: number | null; explanation: string; edited: boolean } {
  if (!edit) return { ...metric, shopValue: null, target: null, score: null, explanation: "Not on this scorecard.", edited: true };
  const score = scoreMetric(edit.shopValue, edit.target, metric.higherIsBetter);
  const meets = score >= 85;
  return {
    ...metric,
    shopValue: edit.shopValue,
    target: edit.target,
    score,
    explanation: meets ? "You entered these numbers; this meets the target." : "You entered these numbers; this misses the target.",
    edited: true,
  };
}
