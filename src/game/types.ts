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
  /** Per-digit highlight mask for the rolled number's decimal string. */
  highlights: boolean[];
  /** Rarity of this badge alone (for card chrome). */
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
  /** Which digits to glow on the breakdown card. Default: all. */
  highlight?: (n: number) => boolean[];
};

export type RollResult = {
  id: string;
  number: number;
  badges: BadgeHit[];
  totalEP: number;
  rarity: RarityTier;
  /** Score percentile 0–100; UI shows “Top X% of roll scores”. */
  percentile: number;
  rolledAt: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppSettings = {
  theme: ThemeMode;
  shareShowRollCount: boolean;
};

export type CollectionEntry = {
  badgeId: string;
  firstEarnedAt: string;
  family: BadgeFamily;
};
