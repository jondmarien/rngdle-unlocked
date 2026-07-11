import type { BadgeEquation } from './badges/equation.js';

export type { BadgeEquation };

export type RarityTier =
  | 'trash'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'anomaly'
  | 'mythic'
  | 'divine';

export type BadgeFamily =
  | 'math'
  | 'pattern'
  | 'void'
  | 'cultural'
  | 'magnitude'
  | 'sequence'
  | 'poker'
  | 'element'
  | 'bases'
  | 'journey'
  | 'lifetime'
  | 'secret';

export type BadgeHit = {
  id: string;
  name: string;
  description: string;
  ep: number;
  family: BadgeFamily;
  emoji: string;
  highlights: boolean[];
  rarity: RarityTier;
  /** Optional custom Grok art (e.g. Absolute Ceiling). */
  image?: string;
  /** Optional equation proof on the badge card. */
  equation?: BadgeEquation;
};

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  ep: number;
  family: BadgeFamily;
  emoji: string;
  matches: (n: number) => boolean;
  highlight?: (n: number) => boolean[];
  /** Optional equation annotator (sibling to highlight). */
  equation?: (n: number) => BadgeEquation | undefined;
  /** Optional custom art under /public (ultra-rare seals). */
  image?: string;
};

export type RollResult = {
  /** Internal stable id (UUID). */
  id: string;
  /** Short public code for vanity share URLs (e.g. /s/user/xK9m2pQ3). */
  shortCode?: string;
  number: number;
  badges: BadgeHit[];
  totalEP: number;
  rarity: RarityTier;
  percentile: number;
  rolledAt: string;
  /** When set, roll came from daily/weekly challenge seed. */
  challengeKey?: string;
  /**
   * How the number was produced.
   * client = local free play · ranked = server free play · challenge = daily/weekly
   */
  source?: 'client' | 'ranked' | 'challenge';
  /** Server HMAC seal after POST /api/attest. */
  attestationSeal?: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppSettings = {
  theme: ThemeMode;
  shareShowRollCount: boolean;
  /** Optional SFX on roll settle / high rarity. Default off. */
  soundEnabled: boolean;
  /** Optional confetti on rare+ settles. Default on. */
  confettiEnabled: boolean;
  /**
   * Trash settle FX — cracked-screen overlay + heavy shake.
   * Default on; independent of rare+ celebrate.
   */
  trashCrackEnabled: boolean;
  /**
   * Follow cascading badge cards with auto-scroll after a roll.
   * Stored in localStorage with other settings (not Neon-only).
   */
  autoScrollBadges: boolean;
  /**
   * Auto-open share panel after anomaly/mythic/divine rolls settle.
   * Default off; localStorage only.
   */
  autoShareHighRarity: boolean;
  /**
   * Show the Latest runs panel on the Roll tab (side rail on xl+, below on mobile).
   * Default on; localStorage only.
   */
  showLatestRuns: boolean;
  /**
   * Blur Latest runs results (eye toggle). Default off = results visible.
   * localStorage only.
   */
  latestRunsSpoilersHidden: boolean;
  /**
   * Include unlocked journey / secret / mastery seals on Discord share text + PNG.
   * Default on; localStorage only. Profile OG uses ?seals=1 when sharing with this on.
   */
  shareShowUnlockedBadges: boolean;
  /**
   * Abbreviate large EP / roll counts (e.g. 4.8M). Default off; localStorage only.
   * Full value remains available via title/tooltip.
   */
  abbreviateLargeNumbers: boolean;
};

export type CollectionEntry = {
  badgeId: string;
  firstEarnedAt: string;
  family: BadgeFamily;
};

/** Compact record of a notable roll for showcase. */
export type RollHighlight = {
  id: string;
  number: number;
  totalEP: number;
  rarity: RarityTier;
  percentile: number;
  badgeCount: number;
  rolledAt: string;
  topBadges: string[];
};

/** Best sum of EP over a consecutive window of rolls. */
export type ConsecutiveHighlight = {
  windowSize: number;
  totalEP: number;
  avgEP: number;
  fromAt: string;
  toAt: string;
  rolls: RollHighlight[];
};

export type PlayStats = {
  /** Consecutive uncommon+ rolls (breaks on trash/common). */
  qualityStreak: number;
  bestQualityStreak: number;
  /** Calendar-day streak (local date). */
  dayStreak: number;
  bestDayStreak: number;
  lastPlayDate: string | null;
  bestRoll: RollHighlight | null;
  /** Best consecutive windows (3 / 5 / 10). */
  bestConsecutive: ConsecutiveHighlight[];
  /** Consecutive odd rolls (n % 2 === 1); resets on even. */
  oddStreak: number;
  bestOddStreak: number;
  /** Consecutive even rolls (incl. 0); resets on odd. */
  evenStreak: number;
  bestEvenStreak: number;
};

export function rollToHighlight(roll: RollResult): RollHighlight {
  return {
    id: roll.id,
    number: roll.number,
    totalEP: roll.totalEP,
    rarity: roll.rarity,
    percentile: roll.percentile,
    badgeCount: roll.badges.length,
    rolledAt: roll.rolledAt,
    topBadges: roll.badges.slice(0, 4).map((b) => `${b.emoji} ${b.name}`),
  };
}
