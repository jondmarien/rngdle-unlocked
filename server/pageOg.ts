/**
 * Static-route Open Graph metadata for crawler HTML.
 * Titles/descriptions are product-facing (Discord / Slack embeds).
 */

export type PageOgSlug =
  | 'home'
  | 'leaderboard'
  | 'features'
  | 'whats-new'
  | 'about'
  | 'collection'
  | 'showcase'
  | 'stats'
  | 'terms'
  | 'privacy';

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
      'Roll 0–1,000,000 anytime. Collect badges, score EP, climb rarity — Free play, Ranked, Daily & Weekly. Not affiliated with rngdle.com.',
    cardHeadline: 'Unlimited rolls',
    cardLabel: 'CSPRNG · badges · EP · Ranked',
  },
  leaderboard: {
    slug: 'leaderboard',
    path: '/leaderboard',
    title: 'Leaderboard · RNGdle Unlocked',
    description:
      'Ranked and Practice boards — Total EP or Best Roll (by EP or rarity). Follow friends and browse the Feed.',
    cardHeadline: 'Leaderboard',
    cardLabel: 'Total EP · Best Roll · Ranked + Practice',
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
      'Player-facing release highlights for RNGdle Unlocked: Ranked, boards, Features, account tools, and more.',
    cardHeadline: "What's new",
    cardLabel: 'Release chronicle · player notes',
  },
  about: {
    slug: 'about',
    path: '/about',
    title: 'About · RNGdle Unlocked',
    description:
      'How to play Free, Ranked, Daily & Weekly, rarity ladders, fairness notes, and stack. Unlimited random numbers, no 24-hour lock.',
    cardHeadline: 'About',
    cardLabel: 'How to play · rarity · fairness',
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
    path: '/showcase',
    title: 'Showcase · RNGdle Unlocked',
    description:
      'Personal bests, streaks, and standout rolls from your unlimited run history.',
    cardHeadline: 'Showcase',
    cardLabel: 'Bests · streaks · highlight rolls',
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
};

/** Path segment → slug (aliases included). */
const PATH_TO_SLUG: Record<string, PageOgSlug> = {
  '': 'home',
  home: 'home',
  roll: 'home',
  leaderboard: 'leaderboard',
  board: 'leaderboard',
  features: 'features',
  'whats-new': 'whats-new',
  changelog: 'whats-new',
  about: 'about',
  collection: 'collection',
  showcase: 'showcase',
  stats: 'stats',
  terms: 'terms',
  privacy: 'privacy',
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
  });
  return `${origin}/api/og?${q.toString()}`;
}
