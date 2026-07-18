/**
 * Reusable profile avatar frames / borders.
 * Subscription frames unlock with Ranked Plus tiers; `ranked` family reserved.
 */

import { tierMeetsMin, type RankedTier } from './ranked-limits.js';

export type ProfileFrameFamily = 'subscription' | 'ranked';

export type ProfileFrameId =
  | 'none'
  | 'sub-rare'
  | 'sub-epic'
  | 'sub-anomaly'
  /** Reserved for future Ranked crown frames — not selectable yet. */
  | 'ranked-today'
  | 'ranked-week'
  | 'ranked-alltime';

export type ProfileFrameDef = {
  id: ProfileFrameId;
  label: string;
  family: ProfileFrameFamily | 'free';
  /** Minimum entitlement tier required (`free` = always). */
  minTier: RankedTier;
  /** Outer chrome classes for the avatar wrapper. */
  ringClass: string;
  /** Tiny pip / badge color token for locked previews. */
  tipColorClass: string;
  /** Whether the frame is offered in the Account picker today. */
  selectable: boolean;
};

export const PROFILE_FRAMES: readonly ProfileFrameDef[] = [
  {
    id: 'none',
    label: 'None',
    family: 'free',
    minTier: 'free',
    ringClass: 'ring-2 ring-(--outline)',
    tipColorClass: 'bg-(--prose-3)',
    selectable: true,
  },
  {
    id: 'sub-rare',
    label: 'Rare rim',
    family: 'subscription',
    minTier: 'rare',
    ringClass:
      'ring-[3px] ring-[color-mix(in_srgb,var(--rare)_85%,transparent)] shadow-[0_0_12px_color-mix(in_srgb,var(--rare)_35%,transparent)]',
    tipColorClass: 'bg-(--rare)',
    selectable: true,
  },
  {
    id: 'sub-epic',
    label: 'Epic rim',
    family: 'subscription',
    minTier: 'epic',
    ringClass:
      'ring-[3px] ring-[color-mix(in_srgb,var(--epic)_85%,transparent)] shadow-[0_0_14px_color-mix(in_srgb,var(--epic)_40%,transparent)]',
    tipColorClass: 'bg-(--epic)',
    selectable: true,
  },
  {
    id: 'sub-anomaly',
    label: 'Anomaly rim',
    family: 'subscription',
    minTier: 'anomaly',
    ringClass:
      'ring-[3px] ring-[color-mix(in_srgb,var(--anomaly)_85%,transparent)] shadow-[0_0_16px_color-mix(in_srgb,var(--anomaly)_45%,transparent)]',
    tipColorClass: 'bg-(--anomaly)',
    selectable: true,
  },
  {
    id: 'ranked-today',
    label: 'Today crown',
    family: 'ranked',
    minTier: 'free',
    ringClass: 'ring-[3px] ring-amber-400/80',
    tipColorClass: 'bg-amber-400',
    selectable: false,
  },
  {
    id: 'ranked-week',
    label: 'Week crown',
    family: 'ranked',
    minTier: 'free',
    ringClass: 'ring-[3px] ring-sky-400/80',
    tipColorClass: 'bg-sky-400',
    selectable: false,
  },
  {
    id: 'ranked-alltime',
    label: 'All-time crown',
    family: 'ranked',
    minTier: 'free',
    ringClass: 'ring-[3px] ring-violet-400/80',
    tipColorClass: 'bg-violet-400',
    selectable: false,
  },
] as const;

const BY_ID = new Map(PROFILE_FRAMES.map((f) => [f.id, f]));

export function isProfileFrameId(
  v: string | null | undefined,
): v is ProfileFrameId {
  return typeof v === 'string' && BY_ID.has(v as ProfileFrameId);
}

export function normalizeProfileFrame(
  v: string | null | undefined,
): ProfileFrameId {
  if (!v || !v.trim()) return 'none';
  const id = v.trim().toLowerCase() as ProfileFrameId;
  return BY_ID.has(id) ? id : 'none';
}

export function getProfileFrame(
  id: string | null | undefined,
): ProfileFrameDef {
  return BY_ID.get(normalizeProfileFrame(id)) ?? PROFILE_FRAMES[0]!;
}

export function isFrameUnlocked(
  id: string | null | undefined,
  userTier: RankedTier,
): boolean {
  const frame = getProfileFrame(id);
  if (!frame.selectable && frame.id !== 'none') return false;
  return tierMeetsMin(userTier, frame.minTier);
}

export function framesUnlockedForTier(tier: RankedTier): ProfileFrameDef[] {
  return PROFILE_FRAMES.filter(
    (f) => f.selectable && tierMeetsMin(tier, f.minTier),
  );
}

/** Frames shown in Account picker (unlocked + locked previews). */
export function framesForPicker(): ProfileFrameDef[] {
  return PROFILE_FRAMES.filter((f) => f.selectable);
}

export function frameStyles(id: string | null | undefined): string {
  return getProfileFrame(id).ringClass;
}

/** Default subscription frame for a paid tier (when current is `none`). */
export function defaultFrameForTier(tier: RankedTier): ProfileFrameId {
  if (tier === 'anomaly') return 'sub-anomaly';
  if (tier === 'epic') return 'sub-epic';
  if (tier === 'rare') return 'sub-rare';
  return 'none';
}

export function tierLabel(tier: RankedTier): string {
  if (tier === 'rare') return 'Rare';
  if (tier === 'epic') return 'Epic';
  if (tier === 'anomaly') return 'Anomaly';
  return 'Free';
}
