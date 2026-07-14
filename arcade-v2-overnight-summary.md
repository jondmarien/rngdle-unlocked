# Arcade v2 overnight summary

Shipped 2026-07-14 on `main` as three feature commits + this summary, then cut as **v0.16.0**.

## What shipped

| Phase | Commit subject | Feature |
|-------|----------------|---------|
| A | Deadline shop upgrade | Opt-in `deadline` spicy upgrade — bust-or-bonus |
| B | Meta Idle Digits | Server-side accrual + claim + start-run bank drain |
| C | Trash streak soft-fail | Cold streak → Digits penalty + half-gain recovery |

Existing shop upgrades (Floor Raise … Bonus Spin) were **not** retuned.

Digits still never convert to EP / Ranked / Practice.

## Locked defaults (as implemented)

### Deadline

- Unlock: after **2** completed runs (`META_UNLOCK_RULES`)
- On buy: `target = max(20, ceil(digits × 1.75))`, **6** rolls
- Success: `+ceil(target × 0.25)` Digits, clear deadline
- Fail: hard bust (same path as DoN lose; score = peak)
- Migration: `scripts/migrate-arcade-deadline.mjs`

### Idle Digits

- Rate: **2 Digits/hour**
- Offline cap: **12 hours** → max **24** Digits per claim window
- Bank cap: **100**
- Claim: Meta **Claim idle Digits** → `POST /api/arcade/claim-idle`
- Spend: **Start run** transfers full bank into starting Digits
- GET shows `pendingIdleDigits` without mutating
- Migration: `scripts/migrate-arcade-idle.mjs`

### Trash soft-fail

- Threshold: **3** consecutive Trash rolls (`trash_streak`, separate from Combo)
- Trigger: lose `max(2, floor(digits × 0.15))`, set **3** soft-fail rolls
- Soft-fail: Digits awards halved (`floor(n/2)`, min 1 if positive)
- Not a bust — recoverable via Rare+ / Reroll / Rarity Lock
- Migration: `scripts/migrate-arcade-trash-softfail.mjs`

## Deviations

None vs the overnight plan. (Epic+ CelebrationLayer shake from earlier work remains under Unreleased → folded into 0.16.0 notes.)

## Morning review priorities

1. **Deadline bust-at-0** — is hard bust too harsh vs debt/soft fail?
2. **Idle rate** — is 2/hour too stingy; is bank 100 ok?
3. **Soft-fail severity** — 15% + half-gain ×3 in live play
4. **Pre-migration active runs** — columns default 0 (no deadline / no soft-fail until new buy/rolls)

## Ops

Run migrations on any environment that has not yet:

```bash
node --env-file=.env.local scripts/migrate-arcade-deadline.mjs
node --env-file=.env.local scripts/migrate-arcade-idle.mjs
node --env-file=.env.local scripts/migrate-arcade-trash-softfail.mjs
```

Prod Neon already migrated during this overnight run.
