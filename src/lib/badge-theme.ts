import type { BadgeFamily, RarityTier } from '../game';

/** Soft family-tinted chip styles (inspired by category pills, not a clone). */
export const FAMILY_PILL: Record<
  BadgeFamily,
  { chip: string; label: string }
> = {
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
  trash: 'border-[var(--outline)] bg-[var(--surface-raised)] text-[var(--prose-3)]',
  common: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300',
  uncommon: 'border-teal-500/30 bg-teal-500/12 text-teal-800 dark:text-teal-300',
  rare: 'border-blue-500/30 bg-blue-500/12 text-blue-800 dark:text-blue-300',
  epic: 'border-violet-500/35 bg-violet-500/12 text-violet-800 dark:text-violet-300',
  anomaly: 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200',
  mythic: 'border-amber-500/45 bg-amber-500/15 text-amber-900 dark:text-amber-200',
};

export function familyPillClass(
  family: string | null | undefined,
): string {
  if (family && family in FAMILY_PILL) {
    return FAMILY_PILL[family as BadgeFamily].chip;
  }
  return 'border-[var(--outline)] bg-[var(--surface-raised)] text-[var(--prose)]';
}

export function rarityPillClass(rarity: string | null | undefined): string {
  if (rarity && rarity in RARITY_PILL) {
    return RARITY_PILL[rarity as RarityTier];
  }
  return 'border-[var(--outline)] bg-[var(--surface-raised)] text-[var(--prose)]';
}
