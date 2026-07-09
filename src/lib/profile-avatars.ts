/** Pre-generated public profile pictures (public/avatars). */

export type ProfileAvatarDef = {
  id: string;
  label: string;
  src: string;
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
