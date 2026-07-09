export type RarityTier =
  | 'trash'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'anomaly'
  | 'mythic';

export type BadgeFamily =
  | 'math'
  | 'pattern'
  | 'void'
  | 'cultural'
  | 'magnitude'
  | 'sequence'
  | 'poker'
  | 'element'
  | 'journey';

export type BadgeHit = {
  id: string;
  name: string;
  description: string;
  ep: number;
  family: BadgeFamily;
  emoji: string;
  highlights: boolean[];
  rarity: RarityTier;
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
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppSettings = {
  theme: ThemeMode;
  shareShowRollCount: boolean;
  /** Optional SFX on roll settle / high rarity. Default off. */
  soundEnabled: boolean;
  /** Optional confetti on rare+ settles. Default on. */
  confettiEnabled: boolean;
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
