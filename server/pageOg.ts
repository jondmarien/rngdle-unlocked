/**
 * Static-route Open Graph metadata for crawler HTML.
 * Titles/descriptions are product-facing (Discord / Slack embeds).
 */

export type PageOgSlug =
  | 'home'
  | 'leaderboard'
  | 'friends'
  | 'arcade'
  | 'features'
  | 'whats-new'
  | 'about'
  | 'collection'
  | 'showcase'
  | 'history'
  | 'stats'
  | 'terms'
  | 'privacy'
  | 'payments';

export type PageOgMeta = {
  slug: PageOgSlug;
  /** Canonical SPA path (no origin) */
  path: string;
  title: string;
  description: string;
  /** Large line on the shared brand OG card */
  cardHeadline: string;
  /** Smaller line under the headline */
  cardLabel: string;
};

export const PAGE_OG: Record<PageOgSlug, PageOgMeta> = {
  home: {
    slug: 'home',
    path: '/',
    title: 'RNGdle Unlocked — unlimited rolls',
    description:
      'Roll 0–1,000,000 anytime. Collect badges, score EP, climb rarity — Free play, Ranked, Arcade Digits, Daily & Weekly. Not affiliated with rngdle.com.',
    cardHeadline: 'Unlimited rolls',
    cardLabel: 'CSPRNG · badges · EP · Arcade',
  },
  leaderboard: {
    slug: 'leaderboard',
    path: '/leaderboard',
    title: 'Leaderboard · RNGdle Unlocked',
    description:
      'Ranked, Practice, and Arcade boards — EP Total / Best Roll, or best Digits run. Follow friends and browse the Feed.',
    cardHeadline: 'Leaderboard',
    cardLabel: 'Ranked · Practice · Arcade · Feed',
  },
  friends: {
    slug: 'friends',
    path: '/friends',
    title: 'Friends · RNGdle Unlocked',
    description:
      'People you follow on RNGdle Unlocked — manage your list and filter the Board to your circle.',
    cardHeadline: 'Friends',
    cardLabel: 'Follow · Board filter · Feed',
  },
  arcade: {
    slug: 'arcade',
    path: '/arcade',
    title: 'Arcade · RNGdle Unlocked',
    description:
      'Roguelite Digits runs — buy upgrades between rolls, cash out or bust on Double or Nothing. Separate from EP.',
    cardHeadline: 'Arcade Mode',
    cardLabel: 'Digits · upgrades · cash out',
  },
  features: {
    slug: 'features',
    path: '/features',
    title: 'Features · RNGdle Unlocked',
    description:
      'Submit and upvote feature requests for RNGdle Unlocked. Sign in to participate.',
    cardHeadline: 'Features',
    cardLabel: 'Requests · upvotes · roadmap',
  },
  'whats-new': {
    slug: 'whats-new',
    path: '/whats-new',
    title: "What's new · RNGdle Unlocked",
    description:
      'Player-facing release highlights for RNGdle Unlocked: Arcade Digits runs, Ranked/Practice boards, Features, and more.',
    cardHeadline: "What's new",
    cardLabel: 'Release chronicle · player notes',
  },
  about: {
    slug: 'about',
    path: '/about',
    title: 'About · RNGdle Unlocked',
    description:
      'How to play Free, Ranked, Daily & Weekly, Arcade Digits runs, rarity ladders, fairness notes, and stack. Unlimited random numbers, no 24-hour lock.',
    cardHeadline: 'About',
    cardLabel: 'How to play · Arcade · fairness',
  },
  collection: {
    slug: 'collection',
    path: '/collection',
    title: 'Badge Codex · RNGdle Unlocked',
    description:
      'Spoiler-safe badge encyclopedia with unlock times and a New tab for recent first unlocks.',
    cardHeadline: 'Badge Codex',
    cardLabel: 'Unlocks · encyclopedia · New tab',
  },
  showcase: {
    slug: 'showcase',
    path: '/history?view=highlights',
    title: 'History · Highlights · RNGdle Unlocked',
    description:
      'Personal bests, streaks, and standout consecutive runs — now under History → Highlights.',
    cardHeadline: 'History Highlights',
    cardLabel: 'Bests · streaks · consecutive runs',
  },
  history: {
    slug: 'history',
    path: '/history',
    title: 'History · RNGdle Unlocked',
    description:
      'Searchable roll log plus Highlights (streaks, best roll, consecutive runs).',
    cardHeadline: 'History',
    cardLabel: 'Rolls · highlights · replay',
  },
  stats: {
    slug: 'stats',
    path: '/stats',
    title: 'Stats · RNGdle Unlocked',
    description:
      'Rarity histogram, EP/hour, and a 28-day streak calendar for your rolls.',
    cardHeadline: 'Stats',
    cardLabel: 'Histogram · EP/hour · calendar',
  },
  terms: {
    slug: 'terms',
    path: '/terms',
    title: 'Terms of Service · RNGdle Unlocked',
    description:
      'Terms of Service for RNGdle Unlocked accounts and cloud features.',
    cardHeadline: 'Terms of Service',
    cardLabel: 'Accounts · cloud · play fair',
  },
  privacy: {
    slug: 'privacy',
    path: '/privacy',
    title: 'Privacy Policy · RNGdle Unlocked',
    description:
      'Privacy Policy for RNGdle Unlocked — how account and progress data are handled.',
    cardHeadline: 'Privacy Policy',
    cardLabel: 'Data · accounts · sync',
  },
  payments: {
    slug: 'payments',
    path: '/payments',
    title: 'Payments · RNGdle Unlocked',
    description:
      'How optional Polar purchases work for RNGdle Unlocked — subscriptions, Ranked caps, and data shared for billing.',
    cardHeadline: 'Payments',
    cardLabel: 'Polar · Ranked tiers · CAD',
  },
};

/** Path segment → slug (aliases included). */
const PATH_TO_SLUG: Record<string, PageOgSlug> = {
  '': 'home',
  home: 'home',
  roll: 'home',
  leaderboard: 'leaderboard',
  board: 'leaderboard',
  friends: 'friends',
  arcade: 'arcade',
  features: 'features',
  'whats-new': 'whats-new',
  changelog: 'whats-new',
  about: 'about',
  collection: 'collection',
  showcase: 'showcase',
  history: 'history',
  stats: 'stats',
  terms: 'terms',
  privacy: 'privacy',
  payments: 'payments',
};

export function resolvePageOgSlug(
  raw: string | null | undefined,
): PageOgSlug | null {
  if (raw == null) return null;
  const key = decodeURIComponent(raw).trim().toLowerCase().replace(/^\//, '');
  return PATH_TO_SLUG[key] ?? null;
}

export function pageOgImageUrl(origin: string, slug: PageOgSlug): string {
  const meta = PAGE_OG[slug];
  const q = new URLSearchParams({
    type: 'page',
    page: slug,
    headline: meta.cardHeadline,
    label: meta.cardLabel,
    // Discord caches og:image by exact URL; bump when PNG pipeline changes.
    v: '2',
  });
  return `${origin}/api/og?${q.toString()}`;
}
