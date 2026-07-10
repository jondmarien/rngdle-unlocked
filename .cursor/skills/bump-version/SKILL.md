---
name: bump-version
description: Project-only RNGdle Unlocked release workflow. Bump to a target or next ideal SemVer, update CHANGELOG/whats-new/docs/site copy, tag + GitHub release, broadcast system inbox, then commit and push. Use only in this repo when the user asks to bump version, cut a release, ship a version, tag vX.Y.Z, or run the release workflow. Do not use in other projects.
disable-model-invocation: true
---

# Bump version (RNGdle Unlocked release)

**Scope:** this repository only (`.cursor/skills/bump-version`). Do not copy or apply in other projects.

End-to-end release: version bump → docs/site copy → commit → annotated tag → GitHub release → system inbox broadcast → push.

Requires network + `gh` auth + `.env.local` with `DATABASE_URL` for the broadcast step.

## When to run

User asks to bump version, cut a release, ship `vX.Y.Z`, or run this skill **in this repo**. Do **not** invent a release mid-feature work unless they ask.

## Inputs

1. **Target version** (optional): exact SemVer like `0.8.0` or `v0.7.2`.
2. If omitted, compute the **next ideal** version from `package.json` + commits since the last tag (see below).
3. **Release title / highlights**: derive from `[Unreleased]` / recent commits; ask only if the player-facing story is unclear.

Normalize: strip leading `v` for `package.json` / docs; use `vX.Y.Z` for git tags and GitHub releases.

## Ideal next version (when unspecified)

Read current `version` in `package.json` and `git log $(git describe --tags --abbrev=0)..HEAD --oneline`.

| Change since last tag                         | Bump      |
| --------------------------------------------- | --------- |
| Breaking API/trust-model / major product mode | **MAJOR** |
| New user-facing feature (Arcade, board, etc.) | **MINOR** |
| Fixes, polish, docs, presentation-only        | **PATCH** |

Prefer the highest applicable tier. If only chore/docs and user said “release anyway”, still patch. If nothing shippable, stop and say so.

## Checklist (execute in order)

Copy and track:

```
Release Progress:
- [ ] 1. Resolve version + gather notes
- [ ] 2. Bump package.json
- [ ] 3. CHANGELOG.md
- [ ] 4. src/lib/whats-new.ts
- [ ] 5. README.md + AGENTS.md + HANDOFF.md
- [ ] 6. Sweep other docs / in-app copy
- [ ] 7. Update scripts/broadcast-release.mjs
- [ ] 8. Verify (typecheck if code changed; fmt)
- [ ] 9. Commit release docs/version
- [ ] 10. Annotated tag + gh release
- [ ] 11. Broadcast system message
- [ ] 12. Push commit + tags
```

### 1. Resolve version + gather notes

- Current: `package.json` → `version`
- Last tag: `git describe --tags --abbrev=0`
- Diff: commits + `CHANGELOG.md` `## [Unreleased]`
- Confirm working tree is intentional (no secrets, no `api/_bundles/`)

### 2. Bump `package.json`

Set `"version": "X.Y.Z"`. Settings/About read `VITE_APP_VERSION` from this via `vite.config.ts` — no separate env edit.

### 3. `CHANGELOG.md` (developer-oriented)

- Move `## [Unreleased]` items under `## [X.Y.Z] - YYYY-MM-DD` (use today’s date from user_info).
- Leave an empty `## [Unreleased]` section at the top.
- Use Keep a Changelog sections: Added / Changed / Fixed / Notes as needed.
- Include migration/ops notes under Notes when schema/scripts must run after deploy.

### 4. `src/lib/whats-new.ts` (player-facing)

Prepend a new `WhatsNewEntry` at the top of `WHATS_NEW`:

- Human title (product voice, not commit subjects)
- `date`: same as changelog day
- `version`: `X.Y.Z` (no `v`)
- `tags`: short product tags (e.g. `UI`, `Arcade`, `Board`)
- `content`: short body + optional headed sections with bullets

Do **not** dump raw CHANGELOG bullets. About links here via `getWhatsNew()[0]`.

### 5. Core docs

| File         | What to update                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `README.md`  | Roadmap / shipped table rows for this release; any feature blurbs that mention the new version        |
| `AGENTS.md`  | “Version in `package.json` (currently **X.Y.Z**)” and any cheat-sheet lines that cite the old version |
| `HANDOFF.md` | Header **Version** + **Latest release** link; add a Done-wave checkbox for this release               |

Latest release link shape:

`https://github.com/jondmarien/rngdle-unlocked/releases/tag/vX.Y.Z`

### 6. Sweep related docs / site copy

Search the repo for the **previous** version string and stale release claims:

```bash
rg -n "0\\.PREV\\.Z|v0\\.PREV\\.Z" --glob '!node_modules' --glob '!dist' --glob '!**/.git/**'
```

Update when they assert “current” / “latest” / shipped status:

- In-app: About, RollModePicker, Leaderboard blurbs, Arcade copy — only if behavior/copy changed this release
- `docs/ARCHITECTURE.md` if trust model or flows changed
- Other `docs/**` only when they state the current version or describe shipped features incorrectly

Skip historical changelog entries, old tags in prose, and `docs/superpowers/` archival plans unless they falsely claim current behavior.

Do **not** invent About/UI redesigns; only sync versioned facts and user-facing release notes.

### 7. `scripts/broadcast-release.mjs`

Rewrite `title` + `body` for this release before running it:

- Title: `New Update! vX.Y.Z — <short player title>`
- Body: 2–4 short sentences (player voice) + always end with:

```
Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new
Open: /whats-new
```

### 8. Verify

- `pnpm fmt` after edits
- If game/API code is part of the same release commit set: `pnpm typecheck` and relevant `pnpm test`
- Pure docs/version bump: fmt is enough unless you touched TS

### 9. Commit

Stage release files only (no `.env`, bundles, debug dumps).

Message style (match repo):

```
Release vX.Y.Z: <short player-facing summary>.
```

Follow the user’s committing-changes-with-git rules (status/diff/log → stage → commit via HEREDOC → status). This skill **does** authorize commit when the user invoked the bump/release workflow.

### 10. Tag + GitHub release

Annotated tag on the release commit:

```bash
git tag -a "vX.Y.Z" -m "vX.Y.Z — <short title>"
gh release create "vX.Y.Z" --title "vX.Y.Z — <short title>" --notes "$(cat <<'EOF'
## Highlights
- <player-facing bullets>

## Links
- What's new: https://rngdle-unlocked.chron0.tech/whats-new
- Full changelog: CHANGELOG.md
EOF
)"
```

Prefer notes aligned with `whats-new` (players) plus a pointer to `CHANGELOG.md` (devs). If the tag already exists, stop and ask — do not move tags on `main`.

### 11. Announce (system inbox)

```bash
node --env-file=.env.local scripts/broadcast-release.mjs
```

Requires `DATABASE_URL`. On failure, report clearly; still finish push if tag/release succeeded, and note that inbox announce is pending.

### 12. Push

```bash
git push origin HEAD
git push origin "vX.Y.Z"
```

Push the commit and the annotated tag. Do not force-push `main`.

## Version decision examples

- User: `/bump-version` after Alerts UI polish only → **patch** (e.g. `0.7.1` → `0.7.2`)
- User: `/bump-version` after Arcade Mode lands → **minor** (e.g. `0.6.0` → `0.7.0`)
- User: `bump to 0.8.0` → use **0.8.0** exactly

## Dual-voice reminder

| Surface                                              | Voice                                           |
| ---------------------------------------------------- | ----------------------------------------------- |
| `CHANGELOG.md`                                       | Developer: files, APIs, migrations, trust notes |
| `whats-new.ts` + broadcast + `gh release` highlights | Player: what changed in the product             |
| `AGENTS.md` / `HANDOFF.md`                           | Agent/ops: current version + pointers           |

## Abort conditions

Stop and ask before continuing if:

- `main` has unrelated dirty files you did not intend to ship
- Target version ≤ current or tag `vX.Y.Z` already exists
- User asked for bump **without** tag/release/push — then do docs+version only and skip steps 10–12
- Broadcast env missing and user required announce — say what failed

## Post-release smoke (mention, don’t block)

After Vercel deploys: Free / Ranked / mode-switch reel; Settings version string; `/whats-new` shows the new entry; Alerts → System shows the broadcast.
