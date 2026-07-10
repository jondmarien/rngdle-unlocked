import type { ChallengeKind } from '../game/challenge';
import { buildPeriodSeed } from '../game/challenge';

/**
 * Forward-looking reset copy for Daily/Weekly challenge lock.
 * Mirrors Ranked's granularity, with a day tier for weekly windows.
 */
export function formatChallengeResetsIn(resetsInSec: number): string {
  const sec = Math.max(0, Math.floor(resetsInSec));
  if (sec < 60) return `Resets in ${sec}s`;
  const minutes = Math.ceil(sec / 60);
  if (minutes < 60) return `Resets in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rem = minutes % 60;
    return rem === 0 ? `Resets in ${hours}h` : `Resets in ${hours}h ${rem}m`;
  }
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
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
