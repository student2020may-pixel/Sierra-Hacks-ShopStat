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

const BEAT_FOR_FULL_MARKS = 0.2;

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
