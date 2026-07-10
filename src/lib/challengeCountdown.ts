import type { ChallengeKind } from '../game/challenge';
import { buildPeriodSeed } from '../game/challenge';

/**
 * Forward-looking reset copy for Daily/Weekly challenge lock.
 * Mirrors Ranked's granularity, with a day tier for weekly windows.
 *
 * Tier boundaries use raw seconds (not ceiled minutes) so values just under
 * 1h / 1d never jump into the next tier and then drop back on the next tick.
 */
export function formatChallengeResetsIn(resetsInSec: number): string {
  const sec = Math.max(0, Math.floor(resetsInSec));
  if (sec < 60) return `Resets in ${sec}s`;
  if (sec < 3600) {
    const minutes = Math.ceil(sec / 60);
    return `Resets in ${minutes}m`;
  }
  if (sec < 86_400) {
    const hours = Math.floor(sec / 3600);
    const rem = Math.floor((sec % 3600) / 60);
    return rem === 0 ? `Resets in ${hours}h` : `Resets in ${hours}h ${rem}m`;
  }
  const days = Math.floor(sec / 86_400);
  const remH = Math.floor((sec % 86_400) / 3600);
  return remH === 0 ? `Resets in ${days}d` : `Resets in ${days}d ${remH}h`;
}

/** Seconds until the next UTC daily/weekly period boundary. */
export function challengeResetsInSec(
  period: ChallengeKind,
  now: number = Date.now(),
): number {
  const endsAt = Date.parse(buildPeriodSeed(period, new Date(now)).endsAt);
  if (!Number.isFinite(endsAt)) return 0;
  return Math.max(0, Math.floor((endsAt - now) / 1000));
}
