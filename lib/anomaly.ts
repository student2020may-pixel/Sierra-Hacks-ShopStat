// Flags repair jobs that spent far longer in the shop than their labor hours explain.
//
// Method: fit "expected days in shop" as a line through (labor hours, days) using a
// Theil–Sen estimator (median of pairwise slopes), which the outliers can't drag
// around. Each job's residual (actual − expected days) is then scored with a robust
// (median/MAD) z-score. We use this instead of an isolation forest because with ~40
// jobs a forest's random splits can flag different jobs on each run, and a deterministic
// result is easier to explain in a demo.
//
// Comparing residuals rather than the raw days-per-hour ratio matters: every job has
// fixed overhead (check-in, drying, detailing), so small jobs naturally have a high
// days-per-hour ratio without being slow.

export interface Job {
  jobId: string;
  laborHours: number;
  daysInShop: number;
  supplements: number;
  dateIn: string;
  dateOut: string;
}

export interface ScoredJob extends Job {
  expectedDays: number;
  /** actual − expected, in days (negative = faster than expected). */
  extraDays: number;
  zScore: number;
  isOutlier: boolean;
}

export interface AnomalyResult {
  jobs: ScoredJob[];
  /** Outliers only, worst first. */
  flagged: ScoredJob[];
  /** Expected days = baseDays + daysPerLaborHour × labor hours. */
  fit: { baseDays: number; daysPerLaborHour: number };
  totalExtraDays: number;
}

/** Modified z-score cutoff recommended by Iglewicz & Hoaglin. */
const Z_CUTOFF = 3.5;
/** Ignore statistically unusual jobs that only ran a day or two long. */
const MIN_EXTRA_DAYS = 3;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function theilSen(xs: number[], ys: number[]): { intercept: number; slope: number } {
  const slopes: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
    }
  }
  const slope = slopes.length ? median(slopes) : 0;
  const intercept = median(ys.map((y, i) => y - slope * xs[i]));
  return { intercept, slope };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function detectOutliers(jobs: Job[]): AnomalyResult {
  if (jobs.length < 5) {
    throw new Error("Need at least 5 jobs to spot outliers.");
  }

  const { intercept, slope } = theilSen(
    jobs.map((j) => j.laborHours),
    jobs.map((j) => j.daysInShop),
  );
  const residuals = jobs.map((j) => j.daysInShop - (intercept + slope * j.laborHours));
  const medRes = median(residuals);
  // Guard against MAD = 0 (e.g. most jobs exactly on the line).
  const mad = median(residuals.map((r) => Math.abs(r - medRes))) || 0.5;

  const scored: ScoredJob[] = jobs.map((j, i) => {
    const expectedDays = Math.max(1, intercept + slope * j.laborHours);
    const extraDays = j.daysInShop - expectedDays;
    const zScore = (0.6745 * (residuals[i] - medRes)) / mad;
    return {
      ...j,
      expectedDays: round1(expectedDays),
      extraDays: round1(extraDays),
      zScore: round1(zScore),
      isOutlier: zScore > Z_CUTOFF && extraDays >= MIN_EXTRA_DAYS,
    };
  });

  const flagged = scored.filter((j) => j.isOutlier).sort((a, b) => b.extraDays - a.extraDays);
  return {
    jobs: scored,
    flagged,
    fit: { baseDays: round1(intercept), daysPerLaborHour: Math.round(slope * 1000) / 1000 },
    totalExtraDays: Math.round(flagged.reduce((sum, j) => sum + j.extraDays, 0)),
  };
}
