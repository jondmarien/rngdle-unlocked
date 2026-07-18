# Plan: README companion roadmap infographics (Part A + Part B)

**Date:** 2026-07-16  
**Status:** Confirmed 2026-07-16 — proceed with generation  
**Branch:** `jondmarien/readme-roadmap-infographics-4b52`  
**Confirmed:** counts 46/35/1, layout A1, placement above table, title softening, `docs/assets/` paths  
**Override:** #6 — use Cursor `GenerateImage` (Grok), not programmatic HTML→PNG

---

## Goal

Add two additive README companion PNGs:

1. **Part A — Shipped roadmap** — visual of every Status & roadmap table row, grouped by version, plus the existing `🔮 Later` item.
2. **Part B — What's next** — the four Planned board items, visually split by maturity (Scoped vs Idea Stage).

Do **not** change existing table content, wording, or status values. Do **not** invent milestones or features beyond the two sources.

---

## Source audit (blocking flags)

### Part A — README table (authoritative)

Read verbatim from `README.md` § Status & roadmap (lines 403–455).

| Claim in task brief  | Actual in README                                                      | Action                                    |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| 45 shipped rows      | **46** shipped rows (`✅ Shipped`)                                    | Use **46**; treat brief count as outdated |
| 46 total rows        | **47** data rows (46 shipped + 1 Later)                               | Use **47**                                |
| 21 distinct versions | **35** distinct version tags (`v0.2.0` … `v0.17.0` including patches) | Use **35** + Later                        |
| v0.4.0 has 6 rows    | **7** area rows                                                       | Use all 7 verbatim                        |

**Implication:** A single-row horizontal timeline is impossible. Even “21 nodes” was already dense; **35 + Later** forces a multi-row or vertical/era layout.

**Unicode note:** One area label uses a non-breaking hyphen in `5‑min New tab` (U+2011). Preserve exactly when rendering.

### Part B — Feedback board (authoritative)

From the Features board screenshot (4 items, all `PLANNED` / `New Feature`):

| Board title                           | Description (verbatim gist)                   | Maturity (task brief)       |
| ------------------------------------- | --------------------------------------------- | --------------------------- |
| `add a legit RANKED system to ranked` | Tier ladder concept (Iron→Challenger) + 👀    | Idea Stage                  |
| `Hard Mode`                           | `7-DIGIT numbers! (-1 through 9,999,999)?!`   | Idea Stage                  |
| `Custom Expansion Badges (Packs)`     | User-created optional badge packs (CAH-style) | Idea Stage                  |
| `Discord bot!!!`                      | Bot that streams the game for Discord servers | **Scoped — ready to build** |

**Title casing flag:** Board title is lowercase (`add a legit…`); task brief Title-cased it. Plan: use **board casing** for fidelity, or Title Case for README polish — **needs confirm** (recommendation below).

**Tone flag:** `Discord bot!!!` is more informal than README/CHANGELOG voice (exclamation stacks are rare). Soften to **Discord bot** in the infographic + subsection copy; keep board intent. **Needs confirm.**

No attached tier-badge artwork will be copied into Part B beyond a short textual callout (“tier ladder concept: Iron → Challenger”) — avoid inventing rank art assets.

---

## Design decisions (proposed)

### Visual system (both parts)

- Dark background (`~#0b1220` / near `--bg`), mint/teal accents, pink/magenta header accents matching README `📌` / `🔮` emoji section style.
- Wide aspect ratio (~2.4:1 to ~3:1) for GitHub README embedding.
- Shared palette so A/B feel paired; Part B uses cooler/dashed “future” framing so “top = done, bottom = future” is instant.
- Fonts: JetBrains Mono / Outfit-like stacks if we render via HTML; avoid Inter/Roboto defaults in generative art.

### Generation method (critical for verbatim text)

**Recommend: programmatic HTML → PNG** (Playwright/Chromium screenshot of a self-contained HTML/CSS artboard), **not** diffusion/`GenerateImage`.

Rationale: Part A requires **46 exact area strings + 35 version tags**. Generative image models routinely misspell or drop labels. Verbatim fidelity is a hard requirement.

Fallback only if Chromium tooling is unavailable: SVG written by hand/code, then `rsvg`/`sharp` rasterize.

### Part A — layout (3 options)

| Option                                        | Shape                                                                                                                                                                          | Pros                                                                                       | Cons                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **A1. Era-clustered card grid** ★ recommended | Columns/rows by era: Foundation `0.2–0.3`, Competitive `0.4.x`, Architecture `0.5`, Boards `0.6–0.7.x`, Content `0.8–0.14`, Arcade polish `0.15–0.16.x`, Latest `0.17` + Later | Fits density; GitHub-scroll friendly; each version is its own card with stacked sub-labels | Era labels are organizational chrome (not in table) — keep them visually quiet |
| **A2. Wrapping multi-row timeline**           | Horizontal ribbons of ~6–7 versions per row, stacked                                                                                                                           | Reads as a timeline                                                                        | Patch spam (`0.16.0`–`0.16.7`) still cramped; tall image                       |
| **A3. Single vertical ladder**                | One column, version → stacked areas                                                                                                                                            | Maximum legibility                                                                         | Very tall; weak “wide README” feel                                             |

**Recommendation: A1.** Group by version (collapse multi-area versions into one marker with stacked sub-labels). Show every version tag and every area label verbatim. Render `Turnstile / EP velocity — 🔮 Later` as a final, visually distinct node (amber/violet dashed border, crystal/🔮 icon — not teal check).

Era chrome is layout-only; do not invent shipped content.

### Part A — README placement

**Recommend: insert the image immediately above the markdown table** (after the short intro sentence, before the `| Area | Status |` table).

Reasoning: visual overview first → table remains the authoritative, searchable source of truth underneath. Table content unchanged.

### Part B — layout

Two-tier structure (not four equal boxes):

1. **Scoped — Ready to build** (full-width / larger panel): Discord bot only
2. **Idea Stage — Not yet scoped** (three equal cards below): Ranked overhaul, Hard Mode, Custom Expansion Badges

No version numbers, ship dates, or timelines.

**Title recommendations:**

| Source                                | Infographic / README title                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add a legit RANKED system to ranked` | **Ranked system overhaul** subtitle + keep board phrase as quote, **or** keep board title Title-Cased: `Add a legit RANKED system to ranked` — prefer Title Case for README |
| `Hard Mode`                           | `Hard Mode`                                                                                                                                                                 |
| `Custom Expansion Badges (Packs)`     | `Custom Expansion Badges (Packs)`                                                                                                                                           |
| `Discord bot!!!`                      | `Discord bot` (drop `!!!`)                                                                                                                                                  |

Short supporting lines stay faithful to board descriptions without inventing scope.

### Part B — README placement

New subsection **below** Status & roadmap (after the table, before “Design docs:”), with its own header:

```markdown
## 🔮 What's next
```

Clearly separated from `## 📌 Status & roadmap`. Do not append under the existing header.

### Asset location

Repo has no README-embedded roadmap images today. Docs live under `docs/`; game art under `public/`.

**Recommend:** `docs/assets/`

```
docs/assets/roadmap-shipped.png
docs/assets/roadmap-whats-next.png
```

Relative embeds from README root. Do not hotlink.

---

## Markdown insertion snippets (proposed)

### Part A — above the table

```markdown
## 📌 Status & roadmap

Version tags match [`CHANGELOG.md`](./CHANGELOG.md) / GitHub releases. Status is only **Shipped** / **Later** — details stay in the Area column.

![Shipped roadmap timeline from v0.2.0 through v0.17.0, plus Turnstile / EP velocity marked Later](./docs/assets/roadmap-shipped.png)

| Area                      | Status                |
| ------------------------- | --------------------- |
| Solo unlimited playground | ✅ Shipped (`v0.2.0`) |

… (table unchanged) …
```

### Part B — new subsection after the table

```markdown
| Turnstile / EP velocity | 🔮 Later |

## 🔮 What's next

Community Features board ideas not yet on the shipped timeline. Maturity differs: one item is scoped enough to build; three are still idea-stage.

![What's next: Discord bot (scoped) and three idea-stage features](./docs/assets/roadmap-whats-next.png)

Design docs:
```

Optional one-line TOC entry under the existing Status & roadmap link — only if we already touch the TOC; otherwise skip to minimize churn.

---

## Part A — complete version → area map (render checklist)

Every label below must appear verbatim (no paraphrasing, no omitted rows):

- **v0.2.0** — Solo unlimited playground; Badges / EP / journey / secrets; Accounts + email auth + `@username` + cloud sync
- **v0.3.0** — Auto sync + vanity share/OG + follows/feed + Daily/Weekly + attestation
- **v0.4.0** — Reel / cascade / EP count-up UX; Server Ranked free play (`/api/ranked-roll`); Dual EP boards (Ranked + Practice) + follows + feed; Community today/week/all-time crowns (Ranked) + overtake notifs; Profiles (vanity + avatars) + Activity unlocks; Codex unlock times + 5‑min New tab; Custom fonts + rarity/family icon art
- **v0.4.1** — OAuth (Discord/GitHub) wiring; Email verification + magic link (Resend); Admin panel (role-gated); Cloned-progress profile pills + sync integrity gate
- **v0.5.0** — Architecture refactor (NodeNext, apiGuards, lib wrappers, Zod, useSync)
- **v0.6.0** — Best Roll board (EP / rarity) + Features tab
- **v0.7.0** — Arcade Mode (Digits runs) + mode-first Board tabs
- **v0.7.1** — Alerts hierarchy + crown grouping; Features status sections
- **v0.7.2** — Ranked quota indicator (remaining + window reset)
- **v0.7.3** — Journey badge artwork (Collection + Profile section)
- **v0.7.4** — Codex search (spoiler-safe badge filter)
- **v0.8.0** — Gap remediation (onboarding, Retry, a11y, shared roll rows, admin/trust)
- **v0.8.1** — Checklist detection + challenge reset countdown + sync integrity
- **v0.9.0** — Divine rarity + poker hand fixes + badge equation proofs
- **v0.10.0** — Bases family, cat/Ultimeme, streak secrets, The Worst, equation proofs v3
- **v0.10.1** — Profile journey collapse + Secret badges; streak unlock art fix
- **v0.10.2** — Friends board filter + `/friends` tab
- **v0.11.0** — Delta cloud sync + OG PNG fix + sync quota stopgap
- **v0.11.1** — Share seals toggle + Features tags/edit/screenshots + UI polish
- **v0.12.0** — Lifetime EP badges + abbreviate large numbers setting
- **v0.12.1** — Ranked all-time Home crown tile + Ranked · crown labels
- **v0.12.2** — Collapsible How to roll (compact mode switch when collapsed)
- **v0.13.0** — Years family + site accent + Arcade ×N + sync/View As backlog
- **v0.14.0** — Atomic Registry (118 elements) + Atomic Seal
- **v0.14.1** — Site-wide accent coverage + Prove roll tip placement
- **v0.15.0** — Arcade juice (Digits tween, rarity punch, shop/SFX, Cash Out weight)
- **v0.16.0** — Arcade Deadline + Idle Digits + trash soft-fail
- **v0.16.1** — Base UI dialogs/toasts + Home unlock lightbox + History Highlights
- **v0.16.2** — Motion polish + embossed profile avatars + motion-design skill
- **v0.16.3** — Route entrance animation + Codex filter chip polish
- **v0.16.4** — Cold lazy-tab settle + Codex chip grid + Latest Runs portal
- **v0.16.5** — Mobile vibration + UTC resets + optional Settings cloud sync
- **v0.16.6** — Section Mastery seal art refresh + Ranked quota pill colors
- **v0.16.7** — Practice Free-only board + Leaderboard All-Time tab
- **v0.17.0** — All-Time Best lane chips + Ranked CTE/UNION RTTs + quota ~180/h
- **Later** — Turnstile / EP velocity (distinct 🔮 marker)

---

## Implementation units (after confirmation)

### U1. Build Part A HTML artboard + export PNG

- Encode the version→areas map above into HTML/CSS (era grid A1).
- Export `docs/assets/roadmap-shipped.png` at retina-friendly width (≥1800px).
- Visual QA: every label present; Later node distinct; legible at README width.

### U2. Build Part B HTML artboard + export PNG

- Two-tier maturity layout; four features only.
- Export `docs/assets/roadmap-whats-next.png` (same width family as Part A).

### U3. Wire README

- Insert Part A image above the table.
- Add `## 🔮 What's next` + Part B image after the table.
- Leave table rows untouched.
- Spot-check rendered markdown locally.

### U4. Commit + PR

- Assets + README + this plan (already in docs).
- No CHANGELOG version bump (docs-only unless maintainer prefers).

---

## Out of scope

- Editing Status & roadmap table cells
- Inventing milestones, dates, or extra planned features
- Copying proprietary rngdle.com assets
- Changing in-app Features board copy
- Shipping Turnstile / Discord bot / Hard Mode product work

---

## Confirmation checklist (resolved 2026-07-16)

1. **Source counts:** ✅ 46 shipped / 35 versions / 1 Later
2. **Part A layout:** ✅ A1 era-clustered card grid
3. **Part A placement:** ✅ Above the table
4. **Part B titles:** ✅ Soften Discord bot; Title-Case Ranked title
5. **Assets path:** ✅ `docs/assets/`
6. **Render method:** ✅ **Override** — Cursor `GenerateImage` (Grok), not programmatic HTML→PNG

Shipped: U1–U3 complete (assets + README wired).
