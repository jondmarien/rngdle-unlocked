# RNGdle Unlocked — Public GTM / Launch Marketing Design

**Status:** Approved (2026-07-18)  
**Approach:** Wedge launch (A) + product-led share loops + minimal ai-ugc brand pack  
**Live:** https://rngdle-unlocked.chron0.tech  
**Repo:** https://github.com/jondmarien/rngdle-unlocked  
**Product version at approval:** v0.19.2  

**Related:** product design [`2026-07-08-rngdle-unlocked-design.md`](./2026-07-08-rngdle-unlocked-design.md), Polar [`../../polar-monetization.md`](../../polar-monetization.md), Discord bot [`../../discord-bot.md`](../../discord-bot.md), ai-ugc pipeline `/root/ai-ugc-pipeline`

---

## 1. Goals and constraints

### Win conditions (30–60 days)

| Priority | Goal | What “good” looks like |
| -------- | ---- | ---------------------- |
| P0 | **Players** | Weekly Ranked unique rollers grow WoW; board not a ghost town |
| P0 | **Money (soft)** | Ranked Plus / Polar funnel clear; non-zero checkouts after density |
| P0 | **Brand** | chrono portfolio + GitHub + LinkedIn narrative; inbound recognition |

Accounts/@usernames are a **leading** metric, not the north star alone.

### Hard constraints

| Constraint | Value |
| ---------- | ----- |
| Jon marketing time | **≤3 h/week** (approve + post only) |
| Cash budget | **$0 ads** (organic only) |
| Agent role | Drafts, packs, calendars, brand-pack work, triage |
| SEO product code | **Owner (Jon) implements** — not agent scope for this GTM workstream |
| Fake social proof | **Forbidden** (no fake counts, bots, manufactured density) |

### Legal / brand lines (always)

- **Not affiliated with [rngdle.com](https://www.rngdle.com/).**
- Honest fairness: Free play = client CSPRNG → Practice; Ranked = server CSPRNG → crowns.
- Plus messaging = convenience / cosmetics / frames / quota — **not pay-to-win**.

---

## 2. Positioning

**One-liner:**  
Unlimited random-number game — roll 0–1,000,000 anytime, collect badges & EP, climb Ranked. No daily lock.

| Element | Content |
| ------- | ------- |
| Category | Browser collection/competition game with daily-number DNA, unlocked |
| Enemy | “One spin, wait 24 hours” |
| Proof | Unlimited Free play · server Ranked · 325 badges · Arcade Digits · share/OG · Discord `/roll` |
| Voice | chrono — sharp, terminal-adjacent, fairness-honest. Not casino-slop, not kawaii gacha |

### Audience wedges (priority)

1. Daily-game / number-game / rngdle-adjacent players  
2. Discord casual-competitive leaderboard players  
3. Indie / web-dev curious (Show HN, PH makers, LinkedIn)

---

## 3. Channel map

### In scope

| Surface | Role | Cadence | Format |
| ------- | ---- | ------- | ------ |
| Discord (home + bot + relevant servers) | Retention + Ranked density | Always-on | `/roll`, board, events, share seals |
| Main Instagram | Brand + play demos | 2×/week sustain | Reels primary; carousel secondary |
| cyber IG (`chron0s_cyb3r_w0rld.ai`) | **Selective only** | 0–1×/week | Same asset only if “built by security-minded eng” angle fits; default skip |
| Main YouTube | Discovery | 1–2×/week | **Shorts only** at first (same 9:16) |
| Reddit | Cold discovery | Launch burst + ~1 useful post / 2 weeks | Value-first text + GIF/demo; max 2 subs on launch day |
| Product Hunt **or** Show HN | One spike | One primary launch day | See §5 decision |
| GitHub | Dev trust | Every release | Notes + demo GIF |
| Portfolio (chron0.tech) | Brand | Once + keep current | Project card + live link |
| LinkedIn | Pro brand | 1 launch + 1 ~30d recap | Long text + link — not AI-UGC reel spam |

### Explicitly parked (first 60 days)

- Snapchat  
- Facebook organic growth cadence  
- YouTube long-form series  
- Paid ads / boosts  
- Daily posting on 6+ platforms  
- Full multi-brand “vanilla OS” rewrite of ai-ugc before first launch posts  
- SEO war on rngdle.com head terms  
- Fake player counts / fake social proof  

**Asset rule:** one master creative bank → caption/resize per channel. No unique creative per platform unless free.

---

## 4. Content system (ai-ugc brand pack — not full rewrite)

### Principle

Reuse `/root/ai-ugc-pipeline` draft → validate → render → (manual) publish.  
**Do not** genericize the entire pipeline before launch.  
**Do** add an **RNGdle brand profile / vertical pack** so the same machine can produce game content.

### Pack contents

| Artifact | Purpose |
| -------- | ------- |
| `BRAND_BRAIN` (rngdle profile) | Voice, motifs, rarity/terminal visuals, banned claims, CTA bank |
| Pillars | e.g. `hook_demo`, `fairness_ranked`, `badge_codex`, `arcade_digits`, `leaderboard_drama`, `build_in_public` |
| Theme / palette | Game/terminal + rarity glow (extend theme enum; don’t force AI red/blue pillars) |
| Research gate | Soften threat-triage for product demos; keep no-fabrication for EP/fairness/product claims |
| Copy chain | Keep humanizer → stop-slop → proofreader |
| Publish | Manual IG default; Shorts path optional; LinkedIn manual text |

### cyber IG policy

Default **off** for RNGdle.  
Enable per-post only when the angle is explicitly builder/security-engineer-shipped-this — avoid brand confusion with AI×cyber feed.

### Launch content bank (first ~14 days)

Agent produces drafts/scripts (and pipeline JSON once pack exists):

1. Hero Reel — Generate → reel lock → high-rarity pop  
2. Contradiction — “Everyone thinks daily games need a lock. Ours doesn’t.”  
3. Ranked vs Free fairness (~30s)  
4. Badge codex flex  
5. Arcade Digits bust / cash-out  
6. Share-card / vanity URL loop  
7. Build-in-public / stack (LinkedIn + GitHub)  
8. How to claim today’s Ranked crown (retention)

Hook pattern (Instagram playbook): **contradict → tactical value → resonance**.

---

## 5. Launch spike decision

**Do not run Product Hunt and Show HN as co-primary the same week.**

| Option | Best for | Note |
| ------ | -------- | ---- |
| Product Hunt | Consumer player discovery | Strong for browser games if maker presence is real that day |
| Show HN | chrono / builder brand + technical credibility | Better fit for stack/fairness story |

**Status at design approval:** still choosable by Jon before Week 1 Day 0.  
**Default recommendation if undecided:** Product Hunt primary for players; Show HN **≥7 days later** as brand follow-up (or reverse if PH day is bad for Jon’s calendar).

Secondary discovery: Reddit (2 subs max on launch day — e.g. web games / internet is beautiful style communities; follow each sub’s rules).

---

## 6. SEO (owner-owned implementation)

### Scope split

| Work | Owner |
| ---- | ----- |
| robots.txt, sitemap, prerender/SSR shell, per-route meta, JSON-LD, perf | **Jon** (in flight at approval) |
| Verify live behavior after Jon ships; flag gaps; keyword/copy suggestions | **Agent** |
| GSC / Bing property verify click | **Jon** (one-time) |
| Portfolio + GitHub external links | Shared (agent can draft copy) |

### Agent verification baseline (2026-07-18, pre-Jon SEO land)

Live checks at approval time:

- `GET /robots.txt` and `GET /sitemap.xml` returned the **SPA `index.html` shell** (not text/xml).  
- Home `index.html` already has useful `description`, `canonical`, Open Graph, Twitter card, dynamic `api/og` image.  
- No real crawlable sitemap discovered yet.

Agent must **re-verify** after Jon deploys (content-type, body shape, key routes, OG still warm). Do **not** open SEO code PRs unless Jon re-requests.

### Keyword clusters (honest early targets)

- `rngdle unlocked`, `unlimited rngdle`  
- `random number game badges`, `browser ranked rng game`  
- Avoid head-on “wordle” / rngdle.com brand war as primary strategy  

---

## 7. Thirty-day timeline

### Week 0 — Preflight (~1 h Jon wall-clock)

- [ ] Smoke: Free → Ranked → share vanity link → Discord `/roll`  
- [ ] Ranked Plus / top-up copy honest on `/plus`  
- [ ] Jon SEO pack deploy; agent verifies live  
- [ ] ai-ugc RNGdle brand pack stub  
- [ ] Portfolio card + GitHub demo GIF  
- [ ] Pick primary spike (PH or Show HN) + date  
- [ ] Seed plan: friends/Discord for Ranked density Day 0–3  
- [ ] Analytics: use whatever free counter already available (Vercel/Plausible/etc.) — no new BI project  

### Week 1 — Launch

| Day | Actions |
| --- | ------- |
| −1 | Discord soft open / hype; board seed starts |
| 0 | Primary spike + Reddit (≤2) + main IG + YT Short + LinkedIn + GitHub release |
| 1–3 | Reply all comments; hard seed Ranked; fix P0 bugs only |
| 4–7 | 2 more short-form from bank; one Discord “claim the daily crown” beat |

### Weeks 2–4 — Sustain (≤3 h/week Jon)

- 2×/week short-form (agent Mon/Thu packs)  
- 1×/week Discord beat  
- GitHub notes on real releases  
- Soft Plus CTA only after multi-player Ranked density is real  
- Kill formats with zero signal after ~2 weeks  

---

## 8. Monetization guardrails

| Stage | Rule |
| ----- | ---- |
| Pre-density | Free Ranked visible and fun; Plus = cosmetics/frames/quota convenience |
| Early density | Existing hour-cap CTAs OK; market as more rolls / frames — not “buy wins” |
| Always | Never smear Free play as “fake”; Ranked fairness is the competitive brand |

**Money success (60d):** clear funnel + any real Plus conversions after week 2+, not revenue theater.

---

## 9. Metrics (minimal)

| Metric | Why |
| ------ | --- |
| Weekly Ranked unique rollers | North-star players |
| Accounts with @username | Funnel |
| Share / OG hit rate | Virality leading indicator |
| Short-form save/share rate | Creative quality |
| Plus checkouts | Soft $ |
| Portfolio / brand inbound | chrono brand |

Skip multi-touch attribution Rube Goldberg.

---

## 10. RACI

| Work | Agent | Jon |
| ---- | ----- | --- |
| Strategy, calendar, captions, scripts | Draft | Approve ≤15 m |
| ai-ugc brand pack + post JSON | Build | Approve look once |
| Local/Tailscale render | Orchestrate | GPU / host if needed |
| Post IG / YT / LinkedIn / Reddit / PH | Draft packs | Post |
| Discord real-time | Starter replies | Own live |
| Launch bugs | Triage | Prioritize |
| SEO code | Verify only | Implement/deploy |
| Spike day presence | Prep checklist | Be present |

---

## 11. Risks (plain)

1. **Empty Ranked board** at spike → launch dies. Seed hard.  
2. **SPA SEO** incomplete → organic Google stays weak until Jon’s pack lands and verifies.  
3. **cyber IG overuse** → brand confusion. Selective only.  
4. **Dual spike same week** → both underperform. One primary.  
5. **Full pipeline vanilla mid-launch** → scope trap. Brand pack first.  
6. **≤3 h/week ignored** → ADHD branch explosion; kill work, don’t add platforms.  

---

## 12. Out of scope for follow-on implementation plan

- Agent-authored SEO code changes (unless Jon re-opens)  
- Snapchat / FB growth systems  
- Full ai-ugc multi-tenant rewrite  
- Paid media  
- Long-form YouTube  

### In scope for follow-on implementation plan

1. RNGdle brand pack in ai-ugc-pipeline (minimal files)  
2. Launch content bank (8 items) as drafts  
3. Channel copy packs (Discord, Reddit, LinkedIn, PH/HN, IG/YT captions)  
4. 30-day calendar + weekly pack template  
5. Live SEO verification checklist (read-only)  
6. Portfolio / GitHub release blurb drafts  
7. Ranked seed + Discord event runbooks  

---

## 13. Approval record

| Item | Decision |
| ---- | -------- |
| Approach A + share loops | Approved |
| Channel list (main IG, selective cyber IG, YT Shorts, Discord, GitHub, portfolio, LinkedIn) | Approved |
| ai-ugc brand pack first (not full vanilla rewrite) | Approved |
| SEO code implementation | **Jon owns; removed from agent GTM build scope** |
| Fake social proof | Banned |
| Primary spike PH vs Show HN | Open until Week 0; see §5 |
| cyber IG default | Use selectively |

---

## 14. Next step

**Spec approved as-written (2026-07-18).**

**Implementation plan:** [`docs/superpowers/plans/2026-07-18-rngdle-unlocked-gtm.md`](../plans/2026-07-18-rngdle-unlocked-gtm.md)  
**Artifact pack (created during plan execution):** `docs/marketing/gtm-2026-07/`

Plan covers: ai-ugc RNGdle brand pack + `game` theme, launch content bank, channel copy, calendars/runbooks, read-only SEO verification. **No SEO code tasks.**