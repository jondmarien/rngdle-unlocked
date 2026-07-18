/** Browser tab titles + meta for SPA routes (humans). Bot OG uses server/pageOg.ts ← seo-copy. */

import type { TabId } from './routes';
import { SEO_COPY, absoluteUrl, type SeoCopy } from './seo-copy';

export function documentTitleForTab(tab: TabId): string {
  return SEO_COPY[tab].title;
}

export function documentTitleForProfile(username: string): string {
  return `@${username} · RNGdle Unlocked`;
}

export function documentTitleForRoll(): string {
  return `Shared roll · RNGdle Unlocked`;
}

export function documentTitleForLegal(
  page: 'terms' | 'privacy' | 'payments',
): string {
  return SEO_COPY[page].title;
}

export function seoCopyForTab(tab: TabId): SeoCopy {
  return SEO_COPY[tab];
}

export function seoCopyForLegal(
  page: 'terms' | 'privacy' | 'payments',
): SeoCopy {
  return SEO_COPY[page];
}

/** Update title, description, and canonical for the current SPA route. */
export function applyDocumentMeta(opts: {
  title: string;
  description: string;
  canonicalPath: string;
}): void {
  if (typeof document === 'undefined') return;
  document.title = opts.title;

  let desc = document.querySelector('meta[name="description"]');
  if (!desc) {
    desc = document.createElement('meta');
    desc.setAttribute('name', 'description');
    document.head.appendChild(desc);
  }
  desc.setAttribute('content', opts.description);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', absoluteUrl(opts.canonicalPath));
}
