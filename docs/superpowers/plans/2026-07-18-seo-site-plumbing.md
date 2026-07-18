# SEO Site Plumbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship crawl/index plumbing for RNGdle Unlocked without Vite SSR.

**Architecture:** Shared `seo-copy.ts` feeds SPA meta + `pageOg`; bot UA rewrites cover every sitemap URL; static robots/sitemap in `public/`.

**Tech Stack:** Vite SPA, Vercel rewrites, schema.org JSON-LD

---

### Task 1: seo-copy + pageOg gaps

**Files:** Create `src/lib/seo-copy.ts`; Modify `server/pageOg.ts`, `src/lib/pageMeta.ts`

- [x] Add shared titles/descriptions/paths including account/settings/notifications
- [x] Keyword-tune home/about
- [x] Wire pageOg to consume shared copy where possible

### Task 2: robots + sitemap + vercel rewrites

**Files:** `public/robots.txt`, `public/sitemap.xml`, `vercel.json`

- [x] robots + sitemap (all tabs except admin + legal)
- [x] Bot rewrites for `/plus`, `/account`, `/settings`, `/notifications`

### Task 3: JSON-LD, SPA meta, fonts, verification hooks, link graph

**Files:** `index.html`, `server/ogHtml.ts`, `src/App.tsx`, About, README

- [x] JSON-LD home; meta verification placeholders
- [x] SPA description/canonical sync
- [x] Font preload; chron0.tech links
