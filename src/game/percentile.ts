/**
 * Deterministic score percentile from total EP.
 * Returns 0–100 where higher EP → higher percentile (“rarer score”).
 * UI copy: “Top X% of roll scores” where X = 100 - percentile (clamped).
 *
 * Anchored to the rarity ladder (see rarity.ts) so labels match how rare the
 * tier feels: anomaly ≈ top 5%, mythic ≈ top 1%. A raw log10(EP) curve used to
 * put 8k–11k EP around top ~20%, which felt far too common for those tiers.
 */
const ANCHORS: readonly { ep: number; percentile: number }[] = [
  { ep: 0, percentile: 0 },
  { ep: 1_650, percentile: 18 }, // trash → common  (~top 82%)
  { ep: 2_200, percentile: 40 }, // common → uncommon (~top 60%)
  { ep: 3_500, percentile: 62 }, // uncommon → rare (~top 38%)
  { ep: 6_500, percentile: 88 }, // rare → epic     (~top 12%)
  { ep: 8_000, percentile: 95 }, // epic → anomaly  (~top 5%)
  { ep: 11_000, percentile: 99 }, // anomaly → mythic (~top 1%)
  { ep: 20_000, percentile: 99.7 },
  { ep: 50_000, percentile: 99.9 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function percentileFromEP(totalEP: number): number {
  const ep = Math.max(0, totalEP);
  if (ep <= 0) return 0;

  const last = ANCHORS[ANCHORS.length - 1]!;
  if (ep >= last.ep) return last.percentile;

  for (let i = 1; i < ANCHORS.length; i++) {
    const lo = ANCHORS[i - 1]!;
    const hi = ANCHORS[i]!;
    if (ep <= hi.ep) {
      const logLo = Math.log10(lo.ep + 1);
      const logHi = Math.log10(hi.ep + 1);
      const logEp = Math.log10(ep + 1);
      const t = logHi === logLo ? 1 : (logEp - logLo) / (logHi - logLo);
      const p = lerp(lo.percentile, hi.percentile, Math.min(1, Math.max(0, t)));
      return Math.min(100, Math.max(0, Math.round(p * 10) / 10));
    }
  }

  return last.percentile;
}

/** Display helper: top percent of scores (lower is rarer). */
export function topPercentFromPercentile(percentile: number): number {
  const top = 100 - percentile;
  return Math.min(100, Math.max(0.1, Math.round(top * 10) / 10));
}

/** Prefer this in UI so labels stay aligned when the curve is recalibrated. */
export function topPercentFromEP(totalEP: number): number {
  return topPercentFromPercentile(percentileFromEP(totalEP));
}
