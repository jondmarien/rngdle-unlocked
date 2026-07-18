# RNGdle Unlocked GTM Implementation Plan

> **For Hermes:** Execute task-by-task. Prefer sequential commits. Use subagent-driven-development only when a task is pure content drafting that can run in parallel (e.g. Tasks 12–15).

**Goal:** Make RNGdle Unlocked publicly launchable under ≤3 h/week Jon time and $0 ads — brand pack in ai-ugc, launch content bank, channel copy packs, calendars/runbooks, and read-only SEO verification.

**Architecture:** Marketing artifacts live in the **rngdle-unlocked** repo under `docs/marketing/gtm-2026-07/`. Creative machine stays **ai-ugc-pipeline** with a **minimal brand pack** (new pillars + `game` theme + brand brain files) — not a full multi-tenant rewrite. SEO product code is **Jon-owned**; agent only verifies live endpoints.

**Tech Stack:** rngdle docs (Markdown); ai-ugc-pipeline (Bun, Zod schema, Remotion tokens); live site `https://rngdle-unlocked.chron0.tech`.

**Spec:** [`docs/superpowers/specs/2026-07-18-rngdle-unlocked-gtm-design.md`](../specs/2026-07-18-rngdle-unlocked-gtm-design.md)

**Execution note (2026-07-18):** ai-ugc-pipeline changes live only on branch `feat/rngdle-brand-pack` (commit `3cec273`). Do **not** merge to ai-ugc `main` until Jon approves. rngdle marketing docs ship on rngdle `main`.

**Out of scope:** SEO code changes, Snapchat/FB growth, paid ads, full ai-ugc vanilla multi-brand OS, fake social proof.

---

### Task checklist

- [x] Task 1: Pull baselines + create marketing folder
- [x] Task 2: Live SEO verification (read-only) + write checklist result
- [x] Task 3: ai-ugc brand brain files (content-only)
- [x] Task 4: Add RNGdle pillars + `game` theme to design tokens
- [x] Task 5: Mirror pillars/theme in schema + draft CLIs + remotion theme
- [x] Task 6: Smoke-scaffold one RNGdle post JSON
- [x] Task 7: Commit ai-ugc brand pack
- [x] Task 8: Launch content bank outline (8 items)
- [x] Task 9: Write post scripts 1–4 (hero, lock contradiction, fairness, codex)
- [x] Task 10: Write post scripts 5–8 (arcade, share loop, BIP, crown)
- [x] Task 11: Channel copy pack — Discord + Reddit
- [x] Task 12: Channel copy pack — LinkedIn + GitHub + portfolio blurb
- [x] Task 13: Channel copy pack — IG/YT captions for bank
- [x] Task 14: Spike kits (Product Hunt + Show HN) + decision stub
- [x] Task 15: 30-day calendar + weekly pack template
- [x] Task 16: Ranked seed + Discord event runbooks
- [x] Task 17: Week-0 preflight checklist (Jon-facing)
- [x] Task 18: Final cross-link from GTM spec + commit rngdle docs

---

### Task 1: Pull baselines + create marketing folder

**Objective:** Fresh trees and a single home for GTM artifacts.

**Repos:**
- Create: `docs/marketing/gtm-2026-07/README.md` (rngdle-unlocked)
- Workdirs: `/tmp/rngdle-gtm` or clone of `jondmarien/rngdle-unlocked`; `/root/ai-ugc-pipeline`

**Step 1: Update clones**

```bash
cd /tmp/rngdle-gtm && git pull --ff-only origin main
cd /root/ai-ugc-pipeline && git status -sb && git pull --ff-only 2>/dev/null || true
```

**Step 2: Create folder + index**

Write `docs/marketing/gtm-2026-07/README.md`:

```markdown
# RNGdle Unlocked — GTM pack (2026-07)

Implements [GTM design](../../superpowers/specs/2026-07-18-rngdle-unlocked-gtm-design.md).

| Path | Purpose |
| ---- | ------- |
| `seo-verify.md` | Live SEO verification log (agent, read-only) |
| `content-bank/` | 8 launch scripts + captions |
| `channels/` | Discord, Reddit, LinkedIn, IG/YT, spike kits |
| `calendar-30d.md` | 30-day calendar |
| `weekly-pack-template.md` | Recurring Mon/Thu pack shape |
| `runbooks/` | Ranked seed + Discord event |
| `week0-preflight.md` | Jon checklist before Day 0 |

**Jon time budget:** ≤3 h/week approve + post.  
**Cash:** $0 ads.  
**SEO code:** owner-owned — do not open SEO PRs here.
```

**Step 3: Commit (rngdle)**

```bash
cd /tmp/rngdle-gtm
git add docs/marketing/gtm-2026-07/README.md
git commit -m "docs(gtm): scaffold marketing pack folder"
```

**Verify:** `test -f docs/marketing/gtm-2026-07/README.md`

---

### Task 2: Live SEO verification (read-only)

**Objective:** Record what is already live after Jon’s SEO ship; flag gaps only.

**Files:**
- Create: `docs/marketing/gtm-2026-07/seo-verify.md`

**Step 1: Run checks**

```bash
set -e
BASE=https://rngdle-unlocked.chron0.tech
echo "## robots.txt"
curl -sI "$BASE/robots.txt" | tr -d '\r' | rg -i 'HTTP/|content-type|content-length'
curl -sL "$BASE/robots.txt"
echo
echo "## sitemap.xml"
curl -sI "$BASE/sitemap.xml" | tr -d '\r' | rg -i 'HTTP/|content-type'
curl -sL "$BASE/sitemap.xml" | head -40
echo
echo "## home meta"
curl -sL "$BASE/" | rg -n 'canonical|description|og:title|application/ld\+json|twitter:card' | head -40
echo
echo "## about crawlability (title in first HTML)"
curl -sL "$BASE/about" | rg -n '<title>|canonical|description' | head -20
```

**Step 2: Write `seo-verify.md`** with date, pass/fail table:

| Check | Pass criteria |
| ----- | ------------- |
| robots.txt | `content-type: text/plain`, body has `Sitemap:` line |
| sitemap.xml | `content-type` xml, lists `/`, `/about`, `/plus` at minimum |
| home meta | canonical + description + og:* present |
| JSON-LD | present **or** noted missing (gap, not agent fix unless asked) |
| prerender/about | meaningful title/description in raw HTML **or** noted SPA shell |

Baseline known good (2026-07-18): robots + sitemap already `text/plain` / `application/xml`.

**Step 3: Commit**

```bash
git add docs/marketing/gtm-2026-07/seo-verify.md
git commit -m "docs(gtm): record live SEO verification"
```

**Do not** edit `public/robots.txt`, `src/lib/seo-copy.ts`, or other SEO product files.

---

### Task 3: ai-ugc brand brain files (content-only)

**Objective:** Single source of RNGdle brand context for drafts.

**Files (ai-ugc-pipeline):**
- Create: `pipeline/content/brands/rngdle/BRAND_BRAIN.md`
- Create: `pipeline/content/brands/rngdle/PILLARS.md`
- Create: `pipeline/content/brands/rngdle/CTA_BANK.md`
- Create: `pipeline/content/brands/rngdle/BANNED_CLAIMS.md`
- Create: `pipeline/content/brands/rngdle/README.md`

**Step 1: README**

```markdown
# Brand: RNGdle Unlocked

Use when drafting posts for https://rngdle-unlocked.chron0.tech

**Default IG handle for this brand:** main chrono IG (not cyber IG).  
**cyber IG:** only if angle is explicitly builder/security-engineer; else skip.

Load order for `/draft-post` style work:
1. This folder’s `BRAND_BRAIN.md`
2. `PILLARS.md` + `CTA_BANK.md` + `BANNED_CLAIMS.md`
3. Global humanizer → stop-slop → proofreader (still apply)

Score axes keep schema names; interpret `defender_usefulness` as **player actionability** for this brand.
```

**Step 2: BRAND_BRAIN.md** (full content)

```markdown
# BRAND_BRAIN — RNGdle Unlocked

## Positioning
**Who:** players who like daily number/Wordle-likes but hate the 24h lock; Discord casual-competitive climbers; curious builders.

**Stand for:** unlimited play, honest fairness (Ranked = server CSPRNG), collection dopamine (badges/EP), no casino-slop.

**Against:** fake scarcity daily locks as the only model; pay-to-win vibes; fake player counts; claiming affiliation with rngdle.com.

**One-line:** Unlimited random-number game — roll 0–1M anytime, badges + EP, climb Ranked. No daily lock.

## Voice
chrono: sharp, terminal-adjacent, dry. First-person OK. Complete sentences. No em-dashes. No fake hype stats.

## Visual
Theme `game` (violet rarity glow on dark terminal). Motifs: digit reels, rarity seals, codex cards, crown, share card. Avoid lock/key cybersecurity clichés unless build-in-public stack post.

## Story
Jon (chrono) shipped a local-first number game that unlocks the daily-genre trap, then added real Ranked competition and Arcade Digits. Built in public; open source.
```

**Step 3: PILLARS.md**

| Pillar | Default theme | Use when |
| ------ | ------------- | -------- |
| `hook_demo` | `game` | Pure gameplay reel / carousel of a roll |
| `fairness_ranked` | `game` | Ranked vs Free / server CSPRNG |
| `badge_codex` | `game` | Badges, secrets, codex |
| `arcade_digits` | `game` | Arcade mode |
| `leaderboard_drama` | `game` | Crowns, overtakes, board |
| `build_in_public` | `hacking` or `ai` | Stack, shipping, LinkedIn-friendly |

**Step 4: CTA_BANK.md**

- Play free: `https://rngdle-unlocked.chron0.tech`
- Ranked: sign in + @username → Ranked mode
- Discord: (fill Jon’s invite URL when posting)
- Plus: only soft CTA after density — frames / quota convenience, never “win more”
- Legal footer fragment: `Not affiliated with rngdle.com.`

**Step 5: BANNED_CLAIMS.md**

- No affiliation with rngdle.com  
- No “guaranteed mythic” / fake odds theater beyond published product math  
- No “Pay to win Ranked”  
- No fabricated DAU/player counts  
- No implying Free play is server-fair for crowns  

**Verify:** all five files exist under `pipeline/content/brands/rngdle/`.

**Commit later with Task 7** (bundle brand pack).

---

### Task 4: Add RNGdle pillars + `game` theme to design tokens

**Objective:** Schema-valid posts can use RNGdle pillars and violet game theme.

**Files (ai-ugc-pipeline):**
- Modify: `renderer/src/design/tokens.ts`

**Step 1: Extend `Pillar` type and `pillarAccent`**

Add to `Pillar` union:

```ts
  | "hook_demo"
  | "fairness_ranked"
  | "badge_codex"
  | "arcade_digits"
  | "leaderboard_drama"
  | "build_in_public";
```

Add accents (violet family + distinct accents):

```ts
  hook_demo: { name: "violet", accent: "#8b5cf6" },
  fairness_ranked: { name: "indigo", accent: "#6366f1" },
  badge_codex: { name: "fuchsia", accent: "#d946ef" },
  arcade_digits: { name: "amber", accent: "#f59e0b" },
  leaderboard_drama: { name: "rose", accent: "#f43f5e" },
  build_in_public: { name: "cyan", accent: "#22d3ee" },
```

**Step 2: Extend `Theme` with `game`**

```ts
export type Theme =
  | "offensive"
  | "defensive"
  | "hacking"
  | "purple-team"
  | "ai"
  | "game";
```

```ts
  game: {
    name: "rarity violet",
    accent: "#8b5cf6",
    accent2: "#a78bfa",
    mood: "dark terminal arcade, digit reels, rarity glow, competitive but clean — browser game energy not casino neon overload",
  },
```

**Step 3: `pillarTheme` map**

```ts
  hook_demo: "game",
  fairness_ranked: "game",
  badge_codex: "game",
  arcade_digits: "game",
  leaderboard_drama: "game",
  build_in_public: "hacking",
```

**Step 4: `themeWall` fallback for `game`**

ponytail: reuse purple-team wall assets (no new wall art required).

```ts
  game: {
    still: "/walls/04-purple-team-bridge.png", // use whatever purple-team still path already exists
    loop: "/walls/04-purple-team-bridge.webm",
    seconds: /* copy from purple-team entry */,
  },
```

If purple-team wall key path differs, **copy exact paths from existing `purple-team` entry** in the same file — do not invent filenames.

**Verify:**

```bash
cd /root/ai-ugc-pipeline/renderer && bun -e "import { pillarTheme, themes } from './src/design/tokens.ts'; console.log(pillarTheme.hook_demo, themes.game.accent)"
```

Expected: `game` and `#8b5cf6`.

---

### Task 5: Mirror pillars/theme in schema + draft CLIs + remotion theme

**Objective:** validate + scaffold accept new pillars.

**Files:**
- Modify: `renderer/src/lib/schema.ts` — `Pillar` z.enum list (same 6 new values)
- Modify: `renderer/scripts/draft.mjs` — `PILLARS` array
- Modify: `renderer/scripts/draft-week.mjs` — `PILLARS` array
- Modify: `renderer/remotion/theme.ts` — `pillarAccent`, `themeAccentColor.game`, `pillarTheme`, `themeWall.game`
- Modify: `renderer/scripts/art-flux.py` — pillar color map if present
- Modify: `renderer/docs/CONTENT_SCHEMA.md` — document new enum values (one line each)
- Modify: `pipeline/content/DRAFT_POST_REFERENCE.md` — add RNGdle pillar table + pointer to `brands/rngdle/`

**Step 1: schema enum** — append the six pillar strings to `z.enum([...])`.

**Step 2: draft.mjs / draft-week.mjs** — append same six to `PILLARS`.

**Step 3: remotion/theme.ts** — keep in sync with tokens (accents + `game: "#8b5cf6"` in `themeAccentColor`).

**Step 4: Docs** — short table in DRAFT_POST_REFERENCE:

```markdown
## RNGdle brand pillars
See `pipeline/content/brands/rngdle/`. Pillars: hook_demo, fairness_ranked, badge_codex, arcade_digits, leaderboard_drama, build_in_public. Default theme `game` (except build_in_public → hacking).
```

**Verify:**

```bash
cd /root/ai-ugc-pipeline/renderer
bun -e "import { Pillar } from './src/lib/schema.ts'; console.log(Pillar.options.includes('hook_demo'))"
```

Expected: `true`.

---

### Task 6: Smoke-scaffold one RNGdle post JSON

**Objective:** Prove scaffold + validate path works end-to-end (no full render required yet).

**Step 1: Scaffold**

```bash
cd /root/ai-ugc-pipeline/renderer
export PATH="$HOME/.bun/bin:$PATH"
DATE=$(date -u +%F)
bun run new -- "$DATE" rngdle-hook-demo-smoke hook_demo --slides=5 --theme=game --voice=none --captions=highlight
```

**Step 2: Minimal edit**

Open `renderer/content/posts/${DATE}_rngdle-hook-demo-smoke.json` and replace TODOs with **non-fabricated** product facts only:

- core_claim about unlimited rolls / no daily lock  
- brand.handle = main IG handle Jon uses (placeholder `@chrono` OK until confirmed)  
- kicker `RNGDLE UNLOCKED`  
- CTA URL `https://rngdle-unlocked.chron0.tech`  
- sources: link live site + GitHub README (real URLs)  
- score axes filled so total matches sum; put player actionability in `defender_usefulness`  
- status: `draft`

**Step 3: Validate**

```bash
bun run validate -- "${DATE}_rngdle-hook-demo-smoke"
```

Expected: exit 0 (advisories OK; zero schema errors).

**Step 4: If validate fails** — fix enum/theme wiring from Tasks 4–5; do not weaken validation.

**Note:** Keep smoke JSON as draft; full art/render is a later execution session when Jon wants assets.

---

### Task 7: Commit ai-ugc brand pack

**Objective:** Persist brand pack on ai-ugc main (or branch if Jon prefers PR).

```bash
cd /root/ai-ugc-pipeline
git status -sb
git add \
  pipeline/content/brands/rngdle \
  pipeline/content/DRAFT_POST_REFERENCE.md \
  renderer/src/design/tokens.ts \
  renderer/src/lib/schema.ts \
  renderer/scripts/draft.mjs \
  renderer/scripts/draft-week.mjs \
  renderer/remotion/theme.ts \
  renderer/scripts/art-flux.py \
  renderer/docs/CONTENT_SCHEMA.md \
  renderer/content/posts/*rngdle-hook-demo-smoke.json
git commit -m "feat(brands): RNGdle Unlocked brand pack + game theme pillars"
# push only if this remote is Jon's expected ai-ugc remote
git push origin HEAD
```

If push policy requires PR: open PR, do not force main.

**Verify:** `git log -1 --oneline` shows commit; validate still passes.

---

### Task 8: Launch content bank outline

**Objective:** Index the 8 launch pieces with pillar + channel + asset type.

**Files:**
- Create: `docs/marketing/gtm-2026-07/content-bank/README.md` (rngdle)

```markdown
# Content bank (launch 14 days)

| # | Slug | Pillar | Primary asset | Channels |
| - | ---- | ------ | ------------- | -------- |
| 1 | hero-reel | hook_demo | 9:16 reel | IG main, YT Shorts, Discord |
| 2 | no-daily-lock | hook_demo | reel + optional 5-slide | IG, YT |
| 3 | ranked-vs-free | fairness_ranked | reel ~30s | IG, YT, Reddit |
| 4 | badge-codex | badge_codex | carousel or reel | IG |
| 5 | arcade-digits | arcade_digits | reel | IG, YT, Discord |
| 6 | share-loop | hook_demo | reel + PNG share card | IG, Discord |
| 7 | build-in-public | build_in_public | LinkedIn text + optional short | LinkedIn, GitHub |
| 8 | claim-crown | leaderboard_drama | reel + Discord event | Discord, IG |

Each item → `NN-slug.md` with: hook, beat sheet, on-screen text, caption, CTA, banned-claim check, cyber-IG? (default no).
```

**Commit** after Tasks 9–10 fill files, or commit outline alone first.

---

### Task 9: Write post scripts 1–4

**Objective:** Ready-to-shoot/draft scripts.

**Files:**
- Create: `docs/marketing/gtm-2026-07/content-bank/01-hero-reel.md`
- Create: `docs/marketing/gtm-2026-07/content-bank/02-no-daily-lock.md`
- Create: `docs/marketing/gtm-2026-07/content-bank/03-ranked-vs-free.md`
- Create: `docs/marketing/gtm-2026-07/content-bank/04-badge-codex.md`

**Template each file MUST use:**

```markdown
# NN — Title

- Pillar:
- Duration:
- cyber IG: no
- Primary CTA: https://rngdle-unlocked.chron0.tech
- Legal: Not affiliated with rngdle.com.

## Hook (0–1s)
…

## Beat sheet
| t | Visual | VO / on-screen |
| - | ------ | -------------- |

## Caption (IG)
…

## Alt text
…

## Banned-claim self-check
- [ ] no fake players
- [ ] no pay-to-win
- [ ] no rngdle.com affiliation
```

**Content requirements:**
1. **Hero:** Generate → reel lock → rarity pop; end on URL  
2. **No lock:** Contradict “daily games need a lock”  
3. **Fairness:** Free = Practice/client; Ranked = server; crowns Ranked-only  
4. **Codex:** 325 badges / NEW pill / spoiler-safe locked entries — use real product language from About page  

**Commit:**

```bash
git add docs/marketing/gtm-2026-07/content-bank/
git commit -m "docs(gtm): content bank scripts 1-4"
```

---

### Task 10: Write post scripts 5–8

**Files:**
- Create: `05-arcade-digits.md`
- Create: `06-share-loop.md`
- Create: `07-build-in-public.md`
- Create: `08-claim-crown.md`

Same template as Task 9.

**Notes:**
5. Digits ≠ EP; cash out / bust  
6. Vanity share `/s/...` needs account; show PNG card path for logged-out  
7. Stack: React 19, Vite, Neon, Better Auth, Polar — LinkedIn tone, not reel spam  
8. Seed toward Discord event “claim today’s Ranked crown”

**Commit:** `docs(gtm): content bank scripts 5-8`

---

### Task 11: Channel copy — Discord + Reddit

**Files:**
- Create: `docs/marketing/gtm-2026-07/channels/discord-launch.md`
- Create: `docs/marketing/gtm-2026-07/channels/reddit-launch.md`

**Discord pack must include:**
- Soft-open (Day −1) short message  
- Day 0 launch message  
- `/roll` bot pointer  
- Event blurb for crown night  
- Rules: no fake density; invite friends to Ranked for real board  

**Reddit pack must include:**
- 2 target sub shortlist with “read rules first” note (agent fills current-appropriate subs at execution time via fresh check)  
- Title options (3)  
- Body (value-first, GIF/demo, honest unlimited + Ranked)  
- Comment reply templates (thanks / how Ranked works / not affiliated)  
- Anti-spam: max 2 subs launch day  

**Commit:** `docs(gtm): Discord + Reddit channel packs`

---

### Task 12: Channel copy — LinkedIn + GitHub + portfolio

**Files:**
- Create: `docs/marketing/gtm-2026-07/channels/linkedin-launch.md`
- Create: `docs/marketing/gtm-2026-07/channels/github-release-blurb.md`
- Create: `docs/marketing/gtm-2026-07/channels/portfolio-card.md`

**LinkedIn:** long-form builder narrative; link live + GitHub; no carousel dump.  
**GitHub:** release notes skeleton + demo GIF checklist (`docs/` or README embed path Jon prefers).  
**Portfolio:** 3-sentence card + bullets (unlimited, Ranked fairness, stack) for chron0.tech.

**Commit:** `docs(gtm): LinkedIn GitHub portfolio copy`

---

### Task 13: IG/YT caption sheet for bank

**Files:**
- Create: `docs/marketing/gtm-2026-07/channels/shortform-captions.md`

One section per content-bank item: IG caption, YT Shorts title (≤100 chars), hashtags light (5 max), first comment CTA.

cyber IG column: default `skip`; only item 7 may be `optional`.

**Commit:** `docs(gtm): shortform caption sheet`

---

### Task 14: Spike kits (PH + Show HN)

**Files:**
- Create: `docs/marketing/gtm-2026-07/channels/spike-product-hunt.md`
- Create: `docs/marketing/gtm-2026-07/channels/spike-show-hn.md`
- Create: `docs/marketing/gtm-2026-07/channels/SPIKE_DECISION.md`

**SPIKE_DECISION.md:**

```markdown
# Primary spike decision

- [ ] Product Hunt on DATE ____
- [ ] Show HN on DATE ____
- Rule: do not co-primary same week.
- Default if undecided: PH for players; Show HN ≥7 days later for builders (or reverse if calendar blocks PH day).
```

**Each spike kit:** tagline options (3), description, first comment, maker comment plan, asset list (logo, gallery, GIF), day-of checklist.

**Commit:** `docs(gtm): PH and Show HN spike kits`

---

### Task 15: 30-day calendar + weekly pack template

**Files:**
- Create: `docs/marketing/gtm-2026-07/calendar-30d.md`
- Create: `docs/marketing/gtm-2026-07/weekly-pack-template.md`

**calendar-30d.md:** Week 0 preflight → Week 1 day-by-day → Weeks 2–4 sustain (2 shortform/week, 1 Discord beat). Map content-bank IDs to days. Leave DATE placeholders for Jon.

**weekly-pack-template.md:** What agent delivers each Mon/Thu (1 reel script + caption + Discord one-liner + optional story). Jon action = approve ≤15m + post.

**Commit:** `docs(gtm): 30-day calendar and weekly pack template`

---

### Task 16: Ranked seed + Discord event runbooks

**Files:**
- Create: `docs/marketing/gtm-2026-07/runbooks/ranked-seed.md`
- Create: `docs/marketing/gtm-2026-07/runbooks/discord-crown-event.md`

**ranked-seed.md:**
- Goal: multi-human Ranked presence before/at spike  
- Steps: friends list, create @username, Ranked rolls, no multi-account fraud, no bots  
- Success: ≥N distinct Ranked usernames visible (Jon sets N; suggest 5–10)  

**discord-crown-event.md:**
- 45–60 min event  
- Announcement copy  
- During: bot `/roll`, link board, celebrate overtakes  
- After: recap + soft Plus only if organic  

**Commit:** `docs(gtm): Ranked seed and crown event runbooks`

---

### Task 17: Week-0 preflight checklist (Jon-facing)

**Files:**
- Create: `docs/marketing/gtm-2026-07/week0-preflight.md`

```markdown
# Week 0 preflight (Jon)

Time box: ~1 hour total.

- [ ] Smoke Free → Ranked → share link → Discord /roll
- [ ] /plus copy honest (no pay-to-win)
- [ ] SEO: skim seo-verify.md; GSC/Bing verify if not done
- [ ] Pick spike date + PH or HN (SPIKE_DECISION.md)
- [ ] Portfolio card live
- [ ] GitHub demo GIF on latest release
- [ ] Seed plan: message friends (runbooks/ranked-seed.md)
- [ ] Confirm main IG + YT login access
- [ ] Agent packs reviewed (content-bank + channels)
```

**Commit:** `docs(gtm): week-0 preflight checklist`

---

### Task 18: Cross-link spec + final commit

**Objective:** Spec points at plan + marketing pack.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-18-rngdle-unlocked-gtm-design.md` — §14 Next step → mark plan written; link paths

Add under §14:

```markdown
**Implementation plan:** [`docs/superpowers/plans/2026-07-18-rngdle-unlocked-gtm.md`](../plans/2026-07-18-rngdle-unlocked-gtm.md)  
**Artifact pack:** [`docs/marketing/gtm-2026-07/`](../../marketing/gtm-2026-07/)
```

**Commit:**

```bash
git add docs/superpowers/specs/2026-07-18-rngdle-unlocked-gtm-design.md \
        docs/superpowers/plans/2026-07-18-rngdle-unlocked-gtm.md \
        docs/marketing/gtm-2026-07
git commit -m "docs(gtm): implementation plan + marketing pack cross-links"
git push origin HEAD
```

**Verify:**

```bash
test -f docs/superpowers/plans/2026-07-18-rngdle-unlocked-gtm.md
rg -n "gtm-2026-07" docs/superpowers/specs/2026-07-18-rngdle-unlocked-gtm-design.md
```

---

## Execution notes

| Concern | Rule |
| ------- | ---- |
| Jon time | Packs are done when Jon can post without rewriting |
| Render | Full Remotion/Comfy/Higgsfield render is **optional follow-on**; scripts + captions ship first |
| Parallelism | Tasks 11–14 content drafts can parallelize after bank outline exists |
| SEO | Re-run Task 2 checks anytime Jon says SEO changed; never code |
| cyber IG | Default skip in every caption sheet |
| Money | No Plus hard-sell in Week 1 copy |

## Definition of done (this plan)

1. ai-ugc accepts RNGdle pillars + `game` theme; smoke JSON validates  
2. `docs/marketing/gtm-2026-07/` has bank, channels, calendar, runbooks, preflight, seo-verify  
3. Spec links plan + pack  
4. Jon can execute Week 0 checklist without inventing copy  

---

## After plan save

Offer execution: start Task 1 → … sequentially, or batch content tasks via subagents after brand pack code lands.
