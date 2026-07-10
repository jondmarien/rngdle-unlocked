import { useEffect, useState } from 'react';
import type { ChallengeKind } from '../game/challenge';
import {
  challengeResetsInSec,
  formatChallengeResetsIn,
} from './challengeCountdown';

const TICK_MS = 30_000;

/**
 * Live countdown to the next UTC daily/weekly challenge reset.
 * Ticks every 30s — enough for h/m granularity without per-second re-renders.
 * Pass null when not in a challenge mode to skip the interval.
 */
export function useCountdownToUtcReset(period: ChallengeKind | null): {
  resetsInSec: number;
  label: string;
} {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (period == null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [period]);

  if (period == null) {
    return { resetsInSec: 0, label: '' };
  }

  const resetsInSec = challengeResetsInSec(period, now);
  return {
    resetsInSec,
    label: formatChallengeResetsIn(resetsInSec),
  };
}
