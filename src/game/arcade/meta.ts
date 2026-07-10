/**
 * Meta-progression unlock evaluation (pure).
 */

import { META_UNLOCK_RULES, STARTER_UNLOCKS } from './economy.js';
import type { ArcadeUpgradeId } from './upgrades.js';

export function defaultUnlockedUpgrades(): ArcadeUpgradeId[] {
  return [...STARTER_UNLOCKS];
}

export function evaluateMetaUnlocks(opts: {
  unlocked: readonly ArcadeUpgradeId[];
  totalRunsCompleted: number;
  bestRunScore: number;
}): { unlocked: ArcadeUpgradeId[]; newlyUnlocked: ArcadeUpgradeId[] } {
  const set = new Set<ArcadeUpgradeId>(opts.unlocked);
  const newlyUnlocked: ArcadeUpgradeId[] = [];

  for (const rule of META_UNLOCK_RULES) {
    if (set.has(rule.upgradeId)) continue;
    const ok =
      rule.kind === 'runs'
        ? opts.totalRunsCompleted >= rule.minRuns
        : opts.bestRunScore >= rule.minScore;
    if (ok) {
      set.add(rule.upgradeId);
      newlyUnlocked.push(rule.upgradeId);
    }
  }

  return { unlocked: [...set], newlyUnlocked };
}
