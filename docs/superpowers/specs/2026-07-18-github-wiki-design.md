# GitHub Wiki design — RNGdle Unlocked

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Companion:** SEO site plumbing spec (same date)

## Goal

Public, yasb-style GitHub Wiki for thorough product/dev docs. Slim the repo README into a digestible front door that links to the wiki. Keep agent/engineering contracts in-repo.

## Source of truth

| Surface | Canonical? | Notes |
|---------|------------|-------|
| `AGENTS.md`, `HANDOFF.md`, `CHANGELOG.md` | Repo only | Not published as living wiki pages |
| `docs/ARCHITECTURE.md` + integration docs | Repo primary | Wiki pages are curated copies/adaptations |
| `docs/wiki/**` | Staging for wiki publish | Reviewable in PRs |
| `*.wiki.git` | Published public docs | Updated via `scripts/publish-wiki.mjs` |

## Audience

1. New players / curious developers (Home, Features, Quick-Start)
2. Operators setting up OAuth / Discord / Polar
3. Contributors who want architecture without reading the whole README

## Information architecture

**Home.md** — three buckets (yasb pattern):

1. **New here?** — Quick-Start, Features, Game-Modes-and-Trust, Roadmap  
2. **Build & operate** — Architecture, Repo-Layout, Routes-and-API, Development-Setup, Environment, FAQ-and-Troubleshooting  
3. **Integrations** — OAuth, Email-Auth, Discord-Bot, Polar-Monetization, Ranked-Plus-Checkout  

Also: Design-Archive, Refactor-Notes. **`_Sidebar.md`** mirrors buckets. Optional `_Footer.md` with live site + `https://chron0.tech` + GitHub.

## Page inventory

| Wiki page | Source |
|-----------|--------|
| Home | Curated hub |
| Quick-Start | README quick start |
| Features | README Features |
| Game-Modes-and-Trust | ARCHITECTURE + README mode table |
| Architecture | `docs/ARCHITECTURE.md` |
| Repo-Layout | README tree + AGENTS §2 (public-safe) |
| Routes-and-API | README + AGENTS §7 |
| Development-Setup | README social/cloud + commands |
| Environment | Env tables → `.env.example` |
| OAuth | `docs/oauth-setup.md` |
| Email-Auth | `docs/email-auth.md` |
| Discord-Bot | `docs/discord-bot.md` |
| Polar-Monetization | `docs/polar-monetization.md` |
| Ranked-Plus-Checkout | `docs/polar-checkout-foundation.md` |
| FAQ-and-Troubleshooting | README FAQ + AGENTS §11 |
| Roadmap | README status + asset links |
| Design-Archive | Index of `docs/superpowers/specs/*` (historical) |
| Refactor-Notes | `docs/refactor-notes-2026-07.md` |

## Publish rules

1. Enable Wikis; create initial Home once so `.wiki.git` clones.  
2. Author only under `docs/wiki/`.  
3. `pnpm wiki:publish` (or `node scripts/publish-wiki.mjs`) copies staging → wiki repo and pushes.  
4. Images: link `raw.githubusercontent.com/jondmarien/rngdle-unlocked/main/docs/assets/...` — do not duplicate large binaries.  
5. No secrets, no `.env` values.

## README slim rules

Keep: badges, live URL, one-paragraph pitch, solo/social table, minimal how-it-works, quick `pnpm dev`, Documentation hub → wiki, CHANGELOG + AGENTS pointers, portfolio `https://chron0.tech`.

Move: long Features, Routes/API tables, Social setup, env table, FAQ, expandable roadmap, What’s next laundry list.

## Success

- `https://github.com/jondmarien/rngdle-unlocked/wiki` has Home + sidebar + thorough pages  
- README clearly shorter with wiki + chron0.tech links  
- Agents still read in-repo `AGENTS.md` / `docs/ARCHITECTURE.md`
