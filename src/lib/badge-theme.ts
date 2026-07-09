import type { BadgeFamily, RarityTier } from '../game';

/** Soft family-tinted chip styles (inspired by category pills, not a clone). */
export const FAMILY_PILL: Record<BadgeFamily, { chip: string; label: string }> =
  {
    math: {
      chip: 'border-blue-500/35 bg-blue-500/15 text-blue-800 dark:text-blue-200',
      label: 'Math',
    },
    pattern: {
      chip: 'border-violet-500/35 bg-violet-500/15 text-violet-800 dark:text-violet-200',
      label: 'Pattern',
    },
    void: {
      chip: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-800 dark:text-zinc-200',
      label: 'Void',
    },
    cultural: {
      chip: 'border-rose-500/35 bg-rose-500/15 text-rose-800 dark:text-rose-200',
      label: 'Cultural',
    },
    magnitude: {
      chip: 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200',
      label: 'Magnitude',
    },
    sequence: {
      chip: 'border-sky-500/35 bg-sky-500/15 text-sky-900 dark:text-sky-200',
      label: 'Sequence',
    },
    poker: {
      chip: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200',
      label: 'Poker',
    },
    element: {
      chip: 'border-teal-500/40 bg-teal-500/15 text-teal-900 dark:text-teal-200',
      label: 'Element',
    },
    journey: {
      chip: 'border-lime-500/35 bg-lime-500/15 text-lime-900 dark:text-lime-200',
      label: 'Journey',
    },
    secret: {
      chip: 'border-amber-400/50 bg-gradient-to-r from-violet-500/20 to-amber-500/20 text-amber-900 dark:text-amber-100',
      label: 'Secret',
    },
  };

export const RARITY_PILL: Record<RarityTier, string> = {
  trash:
    'border-[var(--outline)] bg-[var(--surface-raised)] text-[var(--prose-3)]',
  common:
    'border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300',
  uncommon:
    'border-teal-500/30 bg-teal-500/12 text-teal-800 dark:text-teal-300',
  rare: 'border-blue-500/30 bg-blue-500/12 text-blue-800 dark:text-blue-300',
  epic: 'border-violet-500/35 bg-violet-500/12 text-violet-800 dark:text-violet-300',
  anomaly:
    'border-orange-500/40 bg-orange-500/15 text-orange-800 dark:text-orange-200',
  mythic: 'border-pink-500/45 bg-pink-500/15 text-pink-900 dark:text-pink-200',
};

/**
 * Highlighted digit tiles on badge cards — solid fill by rarity tier.
 * trash grey · common green · uncommon teal · rare blue · epic purple · anomaly orange · mythic pink
 */
export const RARITY_DIGIT_ON: Record<RarityTier, string> = {
  trash:
    'border-zinc-500/50 bg-zinc-500 text-white shadow-sm dark:bg-zinc-400 dark:text-zinc-950',
  common:
    'border-emerald-600/40 bg-emerald-500 text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950',
  uncommon:
    'border-teal-600/40 bg-teal-500 text-white shadow-sm dark:bg-teal-400 dark:text-teal-950',
  rare: 'border-blue-600/40 bg-blue-500 text-white shadow-sm dark:bg-blue-400 dark:text-blue-950',
  epic: 'border-violet-600/40 bg-violet-500 text-white shadow-sm dark:bg-violet-400 dark:text-violet-950',
  anomaly:
    'border-orange-600/40 bg-orange-500 text-white shadow-sm dark:bg-orange-400 dark:text-orange-950',
  mythic:
    'border-pink-600/40 bg-pink-500 text-white shadow-sm dark:bg-pink-400 dark:text-pink-950',
};

export const RARITY_DIGIT_OFF =
  'border-[var(--outline)] bg-[var(--bg)] text-[var(--prose-3)] ring-1 ring-[var(--outline)]';

/** Reel glow ring + shadow per settled rarity (NumberDisplay). */
export const RARITY_GLOW: Record<RarityTier, string> = {
  trash: 'shadow-[0_0_28px_rgba(110,106,98,0.35)] ring-zinc-500/40',
  common: 'shadow-[0_0_36px_rgba(61,122,74,0.45)] ring-emerald-400/50',
  uncommon: 'shadow-[0_0_40px_rgba(45,212,191,0.5)] ring-teal-400/55',
  rare: 'shadow-[0_0_44px_rgba(59,130,246,0.55)] ring-blue-400/60',
  epic: 'shadow-[0_0_48px_rgba(167,139,250,0.55)] ring-violet-400/60',
  anomaly: 'shadow-[0_0_52px_rgba(234,88,12,0.55)] ring-orange-400/65',
  mythic: 'shadow-[0_0_56px_rgba(219,39,119,0.55)] ring-pink-400/70',
};

/** Histogram bar fill per rarity (Stats). */
export const RARITY_BAR: Record<RarityTier, string> = {
  trash: 'bg-zinc-500',
  common: 'bg-slate-400',
  uncommon: 'bg-emerald-500',
  rare: 'bg-sky-500',
  epic: 'bg-violet-500',
  anomaly: 'bg-orange-500',
  mythic: 'bg-amber-400',
};

/** Border ring for highlight tiles (Community bests). */
export function rarityRing(r: RarityTier): string {
  switch (r) {
    case 'mythic':
      return 'border-amber-400/70';
    case 'anomaly':
      return 'border-fuchsia-400/70';
    case 'epic':
      return 'border-violet-400/60';
    case 'rare':
      return 'border-blue-400/55';
    case 'uncommon':
      return 'border-teal-400/50';
    default:
      return 'border-[var(--outline)]';
  }
}

export function familyPillClass(family: string | null | undefined): string {
  if (family && family in FAMILY_PILL) {
    return FAMILY_PILL[family as BadgeFamily].chip;
  }
  return 'border-[var(--outline)] bg-[var(--surface-raised)] text-[var(--prose)]';
}
