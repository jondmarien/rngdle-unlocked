/**
 * Static-route Open Graph metadata for crawler HTML.
 * Titles/descriptions come from shared src/lib/seo-copy.ts.
 */

import {
  SEO_COPY,
  type SeoCopy,
  type SeoPageId,
} from '../src/lib/seo-copy.js';

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
  | 'payments'
  | 'plus'
  | 'account'
  | 'settings'
  | 'notifications';

export type PageOgMeta = {
  slug: PageOgSlug;
  path: string;
  title: string;
  description: string;
  cardHeadline: string;
  cardLabel: string;
};

function fromSeo(slug: PageOgSlug, copy: SeoCopy): PageOgMeta {
  return {
    slug,
    path: copy.path,
    title: copy.title,
    description: copy.description,
    cardHeadline: copy.cardHeadline,
    cardLabel: copy.cardLabel,
  };
}

const SLUG_TO_SEO: Record<PageOgSlug, SeoPageId> = {
  home: 'home',
  leaderboard: 'leaderboard',
  friends: 'friends',
  arcade: 'arcade',
  features: 'features',
  'whats-new': 'whats-new',
  about: 'about',
  collection: 'collection',
  showcase: 'showcase',
  history: 'history',
  stats: 'stats',
  terms: 'terms',
  privacy: 'privacy',
  payments: 'payments',
  plus: 'plus',
  account: 'account',
  settings: 'settings',
  notifications: 'notifications',
};

export const PAGE_OG: Record<PageOgSlug, PageOgMeta> = Object.fromEntries(
  (Object.keys(SLUG_TO_SEO) as PageOgSlug[]).map((slug) => [
    slug,
    fromSeo(slug, SEO_COPY[SLUG_TO_SEO[slug]]),
  ]),
) as Record<PageOgSlug, PageOgMeta>;

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
  plus: 'plus',
  account: 'account',
  settings: 'settings',
  notifications: 'notifications',
  alerts: 'notifications',
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
    v: '2',
  });
  return `${origin}/api/og?${q.toString()}`;
}
