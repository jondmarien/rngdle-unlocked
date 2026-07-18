# SEO verification log (read-only)

**Checked (UTC):** 2026-07-18T07:45:22Z  
**Base:** https://rngdle-unlocked.chron0.tech  
**Method:** curl headers + body samples. No product code changes.

| Check | Result | Notes |
| ----- | ------ | ----- |
| robots.txt content-type | PASS | `text/plain; charset=utf-8` |
| robots.txt body | PASS | Allow `/`, Disallow `/admin`, Sitemap line present |
| sitemap.xml content-type | PASS | `application/xml` |
| sitemap urls | PASS | Includes `/`, `/about`, `/plus`, `/arcade`, legal pages |
| home meta description | PASS | present |
| home canonical | PASS | `https://rngdle-unlocked.chron0.tech/` |
| home og:title / twitter:card | PASS | present |
| home JSON-LD | PASS | `application/ld+json` script present |
| `/about` title in raw HTML | PARTIAL | title present but same generic “unlimited rolls” as home; canonical still home URL in shell sample |
| `/plus` distinct meta | PARTIAL | same title/canonical pattern as SPA shell in sample |

## Gaps (owner / optional follow-up — not agent SEO PRs)

1. Per-route distinct `<title>`, description, canonical for `/about`, `/plus`, etc. if not already handled by Jon’s prerender path beyond what curl saw.
2. Confirm GSC + Bing property verified (Jon click).
3. Re-run this checklist after any SEO deploy.

## Commands to re-run

```bash
BASE=https://rngdle-unlocked.chron0.tech
curl -sI "$BASE/robots.txt" | rg -i 'content-type'
curl -sL "$BASE/robots.txt"
curl -sI "$BASE/sitemap.xml" | rg -i 'content-type'
curl -sL "$BASE/" | rg -n 'canonical|description|ld\+json'
```
