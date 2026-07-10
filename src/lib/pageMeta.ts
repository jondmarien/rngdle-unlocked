/** Browser tab titles for SPA routes (humans). OG crawlers use server/pageOg.ts. */

import type { TabId } from './routes';

const TAB_DOCUMENT_TITLE: Record<TabId, string> = {
  home: 'Roll · RNGdle Unlocked',
  history: 'History · RNGdle Unlocked',
  collection: 'Codex · RNGdle Unlocked',
  showcase: 'Showcase · RNGdle Unlocked',
  stats: 'Stats · RNGdle Unlocked',
  leaderboard: 'Leaderboard · RNGdle Unlocked',
  arcade: 'Arcade · RNGdle Unlocked',
  features: 'Features · RNGdle Unlocked',
  'whats-new': "What's new · RNGdle Unlocked",
  notifications: 'Alerts · RNGdle Unlocked',
  account: 'Account · RNGdle Unlocked',
  about: 'About · RNGdle Unlocked',
  admin: 'Admin · RNGdle Unlocked',
  settings: 'Settings · RNGdle Unlocked',
};

export function documentTitleForTab(tab: TabId): string {
  return TAB_DOCUMENT_TITLE[tab];
}

export function documentTitleForProfile(username: string): string {
  return `@${username} · RNGdle Unlocked`;
}

export function documentTitleForRoll(): string {
  return `Shared roll · RNGdle Unlocked`;
}

export function documentTitleForLegal(page: 'terms' | 'privacy'): string {
  return page === 'terms'
    ? 'Terms of Service · RNGdle Unlocked'
    : 'Privacy Policy · RNGdle Unlocked';
}
