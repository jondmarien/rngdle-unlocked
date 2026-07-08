/**
 * Deterministic score percentile from total EP.
 * Returns 0–100 where higher EP → higher percentile (“rarer score”).
 * UI copy: “Top X% of roll scores” where X = 100 - percentile (clamped).
 */
export function percentileFromEP(totalEP: number): number {
  const ep = Math.max(0, totalEP);
  // Soft logistic-ish curve in log space so mid scores spread out
  if (ep === 0) return 0;
  const log = Math.log10(ep + 1);
  // log10(1)=0 … log10(100001)≈5
  const raw = (log / 5) * 100;
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
}

/** Display helper: top percent of scores (lower is rarer). */
export function topPercentFromPercentile(percentile: number): number {
  const top = 100 - percentile;
  return Math.min(100, Math.max(0.1, Math.round(top * 10) / 10));
}
