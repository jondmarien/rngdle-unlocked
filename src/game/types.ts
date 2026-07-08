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
  | 'journey';

export type BadgeHit = {
  id: string;
  name: string;
  description: string;
  ep: number;
  family: BadgeFamily;
};

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  ep: number;
  family: BadgeFamily;
  matches: (n: number) => boolean;
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
