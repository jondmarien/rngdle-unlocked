# Ranked top-ups + Overload + Plus regen (design)

**Status:** Implementing (Polar P3)  
**Related:** [`docs/polar-monetization.md`](../../polar-monetization.md), [`docs/polar-checkout-foundation.md`](../../polar-checkout-foundation.md)

## Goals

1. Sell hour-scoped **Boost** packs and **Overload** via Polar Checkout Sessions (one-time products).
2. Give Ranked Plus subscribers passive **refill toward cap** (not above cap): Rare/Epic/Anomaly +1/+2/+3 every 6 minutes.
3. Polish Account Ranked Plus CTAs (Upgrade / Downgrade / Current; admin complimentary buttons disabled).

## Product math

### Top-ups (UTC hour only, no rollover)

| SKU      | bonus_rolls | is_overload | Default CAD |
| -------- | ----------- | ----------- | ----------- |
| boost_30 | 30          | false       | CA$0.99     |
| boost_60 | 60          | false       | CA$1.79     |
| overload | 90          | true        | CA$2.99     |

`limit = tierCap + sum(bonus_rolls for current UTC hour)`.

Stacking: pack bonuses ≤ 90/hour; at most one Overload/hour; packs + Overload stack.

### Regen (Ranked Plus only)

| Tier    | Per 6 min | Max refill / hour |
| ------- | --------- | ----------------- |
| free    | 0         | 0                 |
| rare    | 1         | 10                |
| epic    | 2         | 20                |
| anomaly | 3         | 30                |

Lazy effective-used (no new table):

```
ticks = floor(msSinceHourStart / 360000)
regenApplied = min(rawUsed, ticks * rate)
effectiveUsed = rawUsed - regenApplied
remaining = max(0, limit - effectiveUsed)
```

## Architecture

- Shared pure util: `src/game/timedAccrual.ts` (Arcade idle + Ranked regen).
- Checkout: `POST /api/checkout/topup` → Polar session; webhook `order.paid` → `grantTopupIfNew`; refund → revoke by `source_order_id`.
- Quota: `getRankedRollQuota` / roll check apply regen; DTO includes topup + regen fields.
- UI: Account This-hour cards; RankedQuotaPill Top up; CTA labels.

## Trust

- Server CSPRNG Ranked unchanged; top-ups only raise hour limit.
- `externalCustomerId` = Better Auth user id.
- Preflight stacking before Polar charge.
- `/payments` legal already covers non-rollover top-ups.
