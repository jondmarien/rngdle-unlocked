/**
 * Custom Grok Imagine profile emblems (public/avatars) — same seal style as secrets/journey.
 * Tier-gated seals live under public/avatars/tier/ and unlock cumulatively with Ranked Plus.
 */

import { tierMeetsMin, type RankedTier } from './ranked-limits.js';

export type ProfileAvatarDef = {
  id: string;
  label: string;
  src: string;
  /** Omit / `free` = always unlocked. */
  minTier?: RankedTier;
};

export const PROFILE_AVATARS: readonly ProfileAvatarDef[] = [
  { id: 'dice-oracle', label: 'Dice Oracle', src: '/avatars/dice-oracle.jpg' },
  { id: 'void-eye', label: 'Void Eye', src: '/avatars/void-eye.jpg' },
  {
    id: 'mythic-flame',
    label: 'Mythic Flame',
    src: '/avatars/mythic-flame.jpg',
  },
  {
    id: 'anomaly-crystal',
    label: 'Anomaly Crystal',
    src: '/avatars/anomaly-crystal.jpg',
  },
  { id: 'prime-sigil', label: 'Prime Sigil', src: '/avatars/prime-sigil.jpg' },
  { id: 'star-hex', label: 'Star Hex', src: '/avatars/star-hex.jpg' },
  { id: 'neon-rune', label: 'Neon Rune', src: '/avatars/neon-rune.jpg' },
  {
    id: 'midnight-coin',
    label: 'Midnight Coin',
    src: '/avatars/midnight-coin.jpg',
  },
  {
    id: 'cosmic-spiral',
    label: 'Cosmic Spiral',
    src: '/avatars/cosmic-spiral.jpg',
  },
  {
    id: 'emerald-lattice',
    label: 'Emerald Lattice',
    src: '/avatars/emerald-lattice.jpg',
  },
  {
    id: 'amber-reliquary',
    label: 'Amber Reliquary',
    src: '/avatars/amber-reliquary.jpg',
  },
  { id: 'violet-orb', label: 'Violet Orb', src: '/avatars/violet-orb.jpg' },
  // Ranked Plus — Rare (4)
  {
    id: 'tier-rare-01',
    label: 'Sapphire Die',
    src: '/avatars/tier/rare-01.jpg',
    minTier: 'rare',
  },
  {
    id: 'tier-rare-02',
    label: 'Prime Plate',
    src: '/avatars/tier/rare-02.jpg',
    minTier: 'rare',
  },
  {
    id: 'tier-rare-03',
    label: 'Azure Gaze',
    src: '/avatars/tier/rare-03.jpg',
    minTier: 'rare',
  },
  {
    id: 'tier-rare-04',
    label: 'Sapphire Coin',
    src: '/avatars/tier/rare-04.jpg',
    minTier: 'rare',
  },
  // Ranked Plus — Epic (+4 = 8 cumulative)
  {
    id: 'tier-epic-01',
    label: 'Twin Violet Dice',
    src: '/avatars/tier/epic-01.jpg',
    minTier: 'epic',
  },
  {
    id: 'tier-epic-02',
    label: 'Mythic Plume',
    src: '/avatars/tier/epic-02.jpg',
    minTier: 'epic',
  },
  {
    id: 'tier-epic-03',
    label: 'Violet Lattice',
    src: '/avatars/tier/epic-03.jpg',
    minTier: 'epic',
  },
  {
    id: 'tier-epic-04',
    label: 'Cosmic Spiral+',
    src: '/avatars/tier/epic-04.jpg',
    minTier: 'epic',
  },
  // Ranked Plus — Anomaly (+4 = 12 cumulative)
  {
    id: 'tier-anomaly-01',
    label: 'Fracture Die',
    src: '/avatars/tier/anomaly-01.jpg',
    minTier: 'anomaly',
  },
  {
    id: 'tier-anomaly-02',
    label: 'Burning Gaze',
    src: '/avatars/tier/anomaly-02.jpg',
    minTier: 'anomaly',
  },
  {
    id: 'tier-anomaly-03',
    label: 'Molten Rune',
    src: '/avatars/tier/anomaly-03.jpg',
    minTier: 'anomaly',
  },
  {
    id: 'tier-anomaly-04',
    label: 'Crack Coin',
    src: '/avatars/tier/anomaly-04.jpg',
    minTier: 'anomaly',
  },
] as const;

const BY_ID = new Map(PROFILE_AVATARS.map((a) => [a.id, a]));

export function isProfileAvatarId(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.length > 0 && BY_ID.has(v);
}

/** Empty string = none (letter / OAuth image fallback). */
export function normalizeProfileAvatar(v: string | null | undefined): string {
  if (!v || !v.trim()) return '';
  const id = v.trim().toLowerCase();
  return BY_ID.has(id) ? id : '';
}

export function profileAvatarSrc(id: string | null | undefined): string | null {
  const n = normalizeProfileAvatar(id);
  if (!n) return null;
  return BY_ID.get(n)?.src ?? null;
}

export function getProfileAvatar(
  id: string | null | undefined,
): ProfileAvatarDef | null {
  const n = normalizeProfileAvatar(id);
  if (!n) return null;
  return BY_ID.get(n) ?? null;
}

export function avatarMinTier(id: string | null | undefined): RankedTier {
  const av = getProfileAvatar(id);
  return av?.minTier ?? 'free';
}

export function isAvatarUnlocked(
  id: string | null | undefined,
  userTier: RankedTier,
): boolean {
  const n = normalizeProfileAvatar(id);
  if (!n) return true; // "none" always ok
  return tierMeetsMin(userTier, avatarMinTier(n));
}

export function avatarsUnlockedForTier(tier: RankedTier): ProfileAvatarDef[] {
  return PROFILE_AVATARS.filter((a) => tierMeetsMin(tier, a.minTier ?? 'free'));
}

export function freeProfileAvatars(): ProfileAvatarDef[] {
  return PROFILE_AVATARS.filter((a) => !a.minTier || a.minTier === 'free');
}

export function tierProfileAvatars(): ProfileAvatarDef[] {
  return PROFILE_AVATARS.filter(
    (a) =>
      a.minTier === 'rare' || a.minTier === 'epic' || a.minTier === 'anomaly',
  );
}

/** Tier-colored border for Ranked Plus emblem tiles (no default/white edge). */
export function tipRingClassForTier(tier: RankedTier): string {
  if (tier === 'rare') {
    return 'border-2 border-[color-mix(in_srgb,var(--rare)_75%,transparent)]';
  }
  if (tier === 'epic') {
    return 'border-2 border-[color-mix(in_srgb,var(--epic)_75%,transparent)]';
  }
  if (tier === 'anomaly') {
    return 'border-2 border-[color-mix(in_srgb,var(--anomaly)_75%,transparent)]';
  }
  return 'border-2 border-(--outline)';
}
