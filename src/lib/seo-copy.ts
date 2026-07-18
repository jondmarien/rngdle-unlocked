/**
 * Shared SEO copy for SPA meta + bot OG shells.
 * Keep titles/descriptions in sync — do not duplicate ad hoc strings in pageOg/pageMeta.
 */

import type { TabId } from './routes.js';

export const SITE_ORIGIN = 'https://rngdle-unlocked.chron0.tech';
export const PORTFOLIO_URL = 'https://chron0.tech';
export const GITHUB_REPO_URL = 'https://github.com/jondmarien/rngdle-unlocked';
export const WIKI_HOME_URL = `${GITHUB_REPO_URL}/wiki`;

/**
 * Paste when Search Console / Bing give you tokens, then also uncomment
 * matching meta tags in `index.html` (SPA first paint for non-bot fetchers).
 */
export const GOOGLE_SITE_VERIFICATION = '';
export const BING_SITE_VERIFICATION = '';

export type SeoPageId =
  | TabId
  | 'terms'
  | 'privacy'
  | 'payments'
  | 'showcase';

export type SeoCopy = {
  path: string;
  title: string;
  description: string;
  cardHeadline: string;
  cardLabel: string;
};

const HOME_DESCRIPTION =
  'RNGdle Unlocked — unlimited rngdle-style random number game with badges, EP, and browser ranked RNG. Roll 0–1,000,000 anytime. Free play, Ranked, Arcade Digits, Daily & Weekly. Not affiliated with rngdle.com.';

export const SEO_COPY: Record<SeoPageId, SeoCopy> = {
  home: {
    path: '/',
    title: 'RNGdle Unlocked — unlimited rolls',
    description: HOME_DESCRIPTION,
    cardHeadline: 'Unlimited rolls',
    cardLabel: 'CSPRNG · badges · EP · Arcade',
  },
  about: {
    path: '/about',
    title: 'About · RNGdle Unlocked',
    description:
      'How to play RNGdle Unlocked: Free play, Ranked browser RNG, Daily & Weekly, Arcade Digits, random number game badges, rarity, and fairness. Unlimited rolls — no 24-hour lock.',
    cardHeadline: 'About',
    cardLabel: 'How to play · Arcade · fairness',
  },
  features: {
    path: '/features',
    title: 'Features · RNGdle Unlocked',
    description:
      'Submit and upvote feature requests for RNGdle Unlocked. Sign in to participate.',
    cardHeadline: 'Features',
    cardLabel: 'Requests · upvotes · roadmap',
  },
  'whats-new': {
    path: '/whats-new',
    title: "What's new · RNGdle Unlocked",
    description:
      'Player-facing release highlights for RNGdle Unlocked: Ranked Plus, Discord bot, Arcade Digits, boards, and more.',
    cardHeadline: "What's new",
    cardLabel: 'Release chronicle · player notes',
  },
  plus: {
    path: '/plus',
    title: 'Ranked Plus · RNGdle Unlocked',
    description:
      'Subscribe to Ranked Plus (Rare, Epic, Anomaly), manage billing, and buy this-hour Boosts or Overload. Secure Polar checkout.',
    cardHeadline: 'Ranked Plus',
    cardLabel: 'Hour caps · cosmetics · top-ups',
  },
  leaderboard: {
    path: '/leaderboard',
    title: 'Leaderboard · RNGdle Unlocked',
    description:
      'Browser ranked RNG boards — Ranked, Practice, All-Time, and Arcade Digits. EP Total / Best Roll, or best Digits run.',
    cardHeadline: 'Leaderboard',
    cardLabel: 'Ranked · Practice · Arcade · Feed',
  },
  friends: {
    path: '/friends',
    title: 'Friends · RNGdle Unlocked',
    description:
      'People you follow on RNGdle Unlocked — manage your list and filter the Board to your circle.',
    cardHeadline: 'Friends',
    cardLabel: 'Follow · Board filter · Feed',
  },
  arcade: {
    path: '/arcade',
    title: 'Arcade · RNGdle Unlocked',
    description:
      'Roguelite Digits runs — buy upgrades between rolls, cash out or bust on Double or Nothing. Separate from EP.',
    cardHeadline: 'Arcade Mode',
    cardLabel: 'Digits · upgrades · cash out',
  },
  collection: {
    path: '/collection',
    title: 'Badge Codex · RNGdle Unlocked',
    description:
      'Spoiler-safe random number game badges encyclopedia with unlock times and a New tab for recent first unlocks.',
    cardHeadline: 'Badge Codex',
    cardLabel: 'Unlocks · encyclopedia · New tab',
  },
  history: {
    path: '/history',
    title: 'History · RNGdle Unlocked',
    description:
      'Searchable roll log plus Highlights (streaks, best roll, consecutive runs).',
    cardHeadline: 'History',
    cardLabel: 'Rolls · highlights · replay',
  },
  showcase: {
    path: '/history?view=highlights',
    title: 'History · Highlights · RNGdle Unlocked',
    description:
      'Personal bests, streaks, and standout consecutive runs — under History → Highlights.',
    cardHeadline: 'History Highlights',
    cardLabel: 'Bests · streaks · consecutive runs',
  },
  stats: {
    path: '/stats',
    title: 'Stats · RNGdle Unlocked',
    description:
      'Rarity histogram, EP/hour, and a 28-day streak calendar for your rolls.',
    cardHeadline: 'Stats',
    cardLabel: 'Histogram · EP/hour · calendar',
  },
  account: {
    path: '/account',
    title: 'Account · RNGdle Unlocked',
    description:
      'Sign in to RNGdle Unlocked to claim @username, link Discord/GitHub, sync progress, and manage your public profile.',
    cardHeadline: 'Account',
    cardLabel: 'Sign in · @username · sync',
  },
  settings: {
    path: '/settings',
    title: 'Settings · RNGdle Unlocked',
    description:
      'Theme, sound, motion, and cloud sync preferences for RNGdle Unlocked. Sign in optional for local play.',
    cardHeadline: 'Settings',
    cardLabel: 'Theme · sound · sync',
  },
  notifications: {
    path: '/notifications',
    title: 'Alerts · RNGdle Unlocked',
    description:
      'Activity and system alerts for RNGdle Unlocked — follows, unlocks, Ranked crowns, and release broadcasts. Sign in to view.',
    cardHeadline: 'Alerts',
    cardLabel: 'Activity · system inbox',
  },
  admin: {
    path: '/admin',
    title: 'Admin · RNGdle Unlocked',
    description: 'Admin tools for RNGdle Unlocked operators.',
    cardHeadline: 'Admin',
    cardLabel: 'Operators only',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service · RNGdle Unlocked',
    description:
      'Terms of Service for RNGdle Unlocked accounts and cloud features.',
    cardHeadline: 'Terms of Service',
    cardLabel: 'Accounts · cloud · play fair',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy · RNGdle Unlocked',
    description:
      'Privacy Policy for RNGdle Unlocked — how account and progress data are handled.',
    cardHeadline: 'Privacy Policy',
    cardLabel: 'Data · accounts · sync',
  },
  payments: {
    path: '/payments',
    title: 'Payments · RNGdle Unlocked',
    description:
      'How optional Polar purchases work for RNGdle Unlocked — subscriptions, Ranked caps, and data shared for billing.',
    cardHeadline: 'Payments',
    cardLabel: 'Polar · Ranked tiers · CAD',
  },
};

/** Sitemap + bot-shell indexable paths (excludes admin). */
export const SITEMAP_PATHS: string[] = [
  '/',
  '/about',
  '/features',
  '/whats-new',
  '/plus',
  '/arcade',
  '/leaderboard',
  '/friends',
  '/collection',
  '/history',
  '/stats',
  '/account',
  '/settings',
  '/notifications',
  '/privacy',
  '/terms',
  '/payments',
];

export function seoForTab(tab: TabId): SeoCopy {
  return SEO_COPY[tab];
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function homeJsonLd(): Record<string, unknown> {
  const home = SEO_COPY.home;
  return {
    '@context': 'https://schema.org',
    '@type': ['VideoGame', 'WebApplication'],
    name: 'RNGdle Unlocked',
    url: SITE_ORIGIN,
    description: home.description,
    applicationCategory: 'Game',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CAD',
    },
    author: {
      '@type': 'Person',
      name: 'chron0',
      url: PORTFOLIO_URL,
    },
    creator: {
      '@type': 'Person',
      name: 'chron0',
      url: PORTFOLIO_URL,
    },
    codeRepository: GITHUB_REPO_URL,
    keywords:
      'rngdle unlocked, unlimited rngdle, random number game badges, browser ranked rng game',
  };
}
