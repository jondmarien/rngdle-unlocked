import { ensureShortCode } from './evaluate.js';
import { vanityUserSegment } from './ids.js';
import type { BadgeHit, RarityTier, RollResult } from './types.js';

const RARITY_SQUARE: Record<RarityTier, string> = {
  trash: '⬛',
  common: '⬜',
  uncommon: '🟩',
  rare: '🟦',
  epic: '🟪',
  anomaly: '🟧',
  mythic: '🟨',
};

/** Keep Discord paste short — full badge list is on the share link. */
const MAX_BADGE_LINES = 3;

/** Turn badge names into a short Discord-style flavor line. */
export function buildFlavorQuote(badges: BadgeHit[]): string {
  if (badges.length === 0) {
    return 'nothing but the void, and yet we roll';
  }
  const words = badges.slice(0, 8).flatMap((b) =>
    b.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/[\s-]+/)
      .filter((w) => w.length > 1 && w !== 'of' && w !== 'the' && w !== 'a'),
  );
  // Prefer a readable short phrase
  const unique: string[] = [];
  for (const w of words) {
    if (!unique.includes(w)) unique.push(w);
    if (unique.length >= 10) break;
  }
  if (unique.length === 0) return 'curious numbers, curious hearts';
  // Light poetic glue
  const glue = ['all', 'together', 'and', 'yet', 'still', 'our'];
  const parts: string[] = [];
  unique.forEach((w, i) => {
    parts.push(w);
    if (i < unique.length - 1 && i % 3 === 1) {
      parts.push(glue[i % glue.length]!);
    }
  });
  return parts.join(' ');
}

export type ShareTextOptions = {
  /** Site URL for the footer (defaults to current origin in browser). */
  siteUrl?: string;
  /** Prefer OG-friendly share link for this roll when synced. */
  rollShareUrl?: string;
  /** Public username for vanity /s/:user/:code links. */
  username?: string | null;
  showRollCount?: boolean;
  rollCount?: number;
  /** When false, omit public URL (logged-out or not yet cloud-published). */
  includePublicLink?: boolean;
};

/** Vanity share URL: https://host/s/username/shortCode (no /api, no UUID). */
export function buildRollShareUrl(
  roll: RollResult,
  opts: { siteUrl?: string; username?: string | null } = {},
): string {
  const withCode = ensureShortCode(roll);
  let origin =
    opts.siteUrl ??
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://rngdle-unlocked.chron0.tech');
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    origin = 'https://rngdle-unlocked.chron0.tech';
  }
  const user = vanityUserSegment(opts.username);
  const code = withCode.shortCode!;
  return `${origin.replace(/\/$/, '')}/s/${encodeURIComponent(user)}/${encodeURIComponent(code)}`;
}

/**
 * Discord-friendly share block, aligned with RNGdle-style paste:
 *
 * RNGdle Unlocked 🎲 473389
 *
 * ⬜ COMMON
 *
 * ⬜ 🎰 Lucky Seven
 * ⬜ 💨 Oxygen (8)
 * +10 more
 *
 * "flavor line"
 *
 * 3,179 EP
 * https://…
 */
export function buildShareText(
  roll: RollResult,
  opts: ShareTextOptions = {},
): string {
  const sq = RARITY_SQUARE[roll.rarity];
  const rarity = roll.rarity.toUpperCase();
  const numberPlain = String(roll.number); // no locale commas — cleaner Discord paste

  const sorted = [...roll.badges].sort((a, b) => b.ep - a.ep);
  const shown = sorted.slice(0, MAX_BADGE_LINES);
  const more = sorted.length - shown.length;

  const badgeLines = shown.map((b) => `${sq} ${b.emoji} ${b.name}`);
  if (more > 0) {
    badgeLines.push(`+${more} more`);
  }
  if (badgeLines.length === 0) {
    badgeLines.push(`${sq} (no badges)`);
  }

  const quote = buildFlavorQuote(sorted);
  const ep = roll.totalEP.toLocaleString('en-US');

  const includeLink = opts.includePublicLink !== false;
  // Vanity path /s/user/code — requires cloud sync + account for public use.
  const link = includeLink
    ? (opts.rollShareUrl ??
      buildRollShareUrl(roll, {
        siteUrl: opts.siteUrl,
        username: opts.username,
      }))
    : null;

  const lines = [
    `RNGdle Unlocked 🎲 ${numberPlain}`,
    '',
    `${sq} ${rarity}`,
    '',
    ...badgeLines,
    '',
    `"${quote}"`,
    '',
    `${ep} EP`,
  ];

  if (opts.showRollCount && opts.rollCount != null) {
    lines.push(`${opts.rollCount.toLocaleString('en-US')} lifetime rolls`);
  }

  if (link) {
    lines.push(link);
  }

  return lines.join('\n');
}
