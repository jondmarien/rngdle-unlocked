# SEO & site plumbing design — RNGdle Unlocked

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Companion:** GitHub Wiki design (same date)

## Goal

Launch-week crawl/index readiness for the Vite SPA on Vercel **without** full SSR. Harden existing bot HTML shells; add robots/sitemap, JSON-LD, shared route meta, font preload, Search Console/Bing meta hooks, and portfolio link graph.

## Locked decisions

| Input | Decision |
|-------|----------|
| Portfolio | `https://chron0.tech` |
| GSC + Bing | HTML meta tags (tokens pasted when ready; placeholders OK until then) |
| Sitemap | All SPA tabs **except `/admin`**, plus `/privacy`, `/terms`, `/payments` |
| Vite SSR | Deferred — revisit only if GSC shows thin shells |

## Architecture

```
Humans → index.html SPA
Bots (UA rewrite) → /api/page/:slug → ogHtml + pageOg/seo-copy
Shared → src/lib/seo-copy.ts (titles, descriptions, paths, JSON-LD)
```

## Deliverables

1. `public/robots.txt` — Allow `/`; Disallow `/admin`; Sitemap URL; do not block JS/CSS assets. Allow crawlers to use rewritten `/api/page` and `/api/og` (do not blanket-disallow `/api/` if that breaks OG; prefer Disallow only `/admin` and optionally sensitive API write paths if needed — **v1: Allow `/`, Disallow `/admin`, Sitemap line**).
2. `public/sitemap.xml` — every included URL with absolute `https://rngdle-unlocked.chron0.tech` locs.
3. `vercel.json` — bot rewrite for `/plus`, `/account`, `/settings`, `/notifications` (and any other sitemap URL missing a rewrite).
4. `src/lib/seo-copy.ts` — single source for title/description/path; wire SPA (`pageMeta` / App) and `server/pageOg.ts`.
5. JSON-LD `@type: ["VideoGame","WebApplication"]` on home (`index.html` + bot home HTML).
6. SPA updates `document.title`, meta description, canonical on route change.
7. Preload JetBrains Mono for reel LCP (stable public font path under `node_modules/@fontsource` served by Vite, or CSS `font-display` + preload of the woff2 Vite emits — verify in build).
8. Meta placeholders: `google-site-verification`, `msvalidate.01` (empty content or comment until tokens).
9. Keyword-aware home/about copy: rngdle unlocked, unlimited rngdle, random number game badges, browser ranked rng game.
10. Link graph: README, About, wiki Home → chron0.tech + GitHub.

## Keyword clusters (honest)

Primary: `rngdle unlocked`  
Secondary: `unlimited rngdle`, `random number game badges`, `browser ranked rng game`  
Avoid day-one “wordle” head terms.

## Personal tab shells

`/account`, `/settings`, `/notifications`: generic bot titles/descriptions (sign-in prompts). No personalized data.

## Success

- robots + sitemap live  
- Bot HTML for every sitemap URL  
- JSON-LD validates  
- SPA meta sync works  
- Portfolio linked  
- GSC/Bing ready for token paste  
