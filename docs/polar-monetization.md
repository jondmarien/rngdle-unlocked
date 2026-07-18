# Polar monetization

RNGdle Unlocked uses [Polar](https://polar.sh) as Merchant of Record for optional Ranked subscription tiers (and later hour-scoped top-ups).

Player-facing disclosure: [`/payments`](https://rngdle-unlocked.chron0.tech/payments) (MoR legal page — not a storefront). Architecture diagram: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (Polar entitlements section). Checkout storefront (Account Ranked Plus, P2 shipped): [`polar-checkout-foundation.md`](./polar-checkout-foundation.md).

## Org status

**Chron0's Tech** Polar org is **active**: account review / identity / payouts approved. Capabilities `checkout_payments`, `subscription_renewals`, `payouts`, and `refunds` are enabled. Subscription products are **public**.

## Env vars (names only)

| Variable                                    | Where           | Purpose                                |
| ------------------------------------------- | --------------- | -------------------------------------- |
| `POLAR_API_KEY`                             | server / Vercel | Outbound Polar API (checkout + portal) |
| `POLAR_WEBHOOK_SECRET`                      | server / Vercel | Verify inbound webhook signatures      |
| `POLAR_PRODUCT_RARE` / `_EPIC` / `_ANOMALY` | optional        | Override public product UUIDs          |

Never expose these to the Vite client. Documented in `.env.example` without values.

## Webhook

- URL: `https://rngdle-unlocked.chron0.tech/api/webhooks/polar`
- Format: raw JSON
- Handler: [`api/webhooks/polar.ts`](../api/webhooks/polar.ts) → [`server/polar/webhooks.ts`](../server/polar/webhooks.ts)
- Verify: `@polar-sh/sdk` `validateEvent` + `POLAR_WEBHOOK_SECRET`
- Idempotency: `polar_webhook_events.webhook_id` (Standard Webhooks `webhook-id` header)
- Entitlements: [`server/polar/entitlements.ts`](../server/polar/entitlements.ts) → `user_entitlements`

Key events: `order.paid`, `order.refunded`, `subscription.created|active|updated|canceled|revoked|past_due`, `customer.created|updated`. Extra subscribed events are ignored safely.

## Ranked quota tiers

| Tier    | Rolls / UTC hour | Polar product (public) | CAD / month |
| ------- | ---------------- | ---------------------- | ----------- |
| Free    | 90               | —                      | —           |
| Rare    | 120              | RNGdle Rare            | CA$4.99     |
| Epic    | 150              | RNGdle Epic            | CA$9.99     |
| Anomaly | 180              | RNGdle Anomaly         | CA$14.99    |

Constants: [`src/lib/ranked-limits.ts`](../src/lib/ranked-limits.ts) (`RANKED_ROLLS_PER_HOUR`, `RANKED_TIER_CAPS`).

Product metadata (required for webhook mapping):

- `tier`: `rare` | `epic` | `anomaly`
- `ranked_rolls_per_hour`: `120` | `150` | `180`

Checkout sets Polar customer `external_id` = Better Auth `user.id` via Checkout Sessions (`externalCustomerId`).

## Checkout (Account Ranked Plus)

| Endpoint                    | Role                                                           |
| --------------------------- | -------------------------------------------------------------- |
| `POST /api/checkout`        | Auth + `@username`; body `{ tier, discountCode? }` → `{ url }` |
| `POST /api/checkout/portal` | Auth; Polar customer portal → `{ url }`                        |
| Client                      | [`src/lib/checkout-api.ts`](../src/lib/checkout-api.ts)        |

Flow: Account product cards → create session → Polar hosted checkout → `/account?checkout=success` polls `GET /api/me` → webhook unlocks entitlements. Friend codes: in-app field and/or Polar `allowDiscountCodes`.

## Cosmetics (entitlement-gated)

- Profile frames: [`src/lib/profile-frames.ts`](../src/lib/profile-frames.ts) — Rare / Epic / Anomaly frames (`user.profile_frame`)
- Tier emblems: 12 seals under `public/avatars/tier/` — cumulative unlock **4 / 8 / 12** ([`src/lib/profile-avatars.ts`](../src/lib/profile-avatars.ts))
- Server rejects locked `profileAvatar` / `profileFrame` on `PATCH /api/me`

## Admin complimentary tier

`getEffectiveRankedTier` grants **Anomaly** (highest tier) to users with `role=admin` or ids in `ADMIN_USER_IDS`. No Polar subscription row required — Ranked hour cap + cosmetics unlock as if subscribed. Polar checkout is still available if an admin wants a real customer record.

## Friend discounts

Ops can mint **100% forever** percentage discounts scoped to the three subscription products via `scripts/create-friend-discounts.mjs` (`POLAR_API_KEY`). Codes are printed to stdout only — **never commit codes** to the repo.

## Schema / migration

Additive scripts:

```bash
node --env-file=.env.local scripts/migrate-polar-entitlements.mjs
node --env-file=.env.local scripts/migrate-profile-frame.mjs
```

Tables: `user_entitlements`, `polar_webhook_events`, `ranked_topups`. Column: `user.profile_frame`.

## Top-ups + Ranked Plus regen (P3)

| SKU        | Effect                          | Env override             |
| ---------- | ------------------------------- | ------------------------ |
| `boost_30` | +30 `bonus_rolls` this UTC hour | `POLAR_PRODUCT_BOOST_30` |
| `boost_60` | +60                             | `POLAR_PRODUCT_BOOST_60` |
| `overload` | +90, `is_overload`              | `POLAR_PRODUCT_OVERLOAD` |

- Checkout: `POST /api/checkout/topup` `{ sku }` → Polar Session; webhook `order.paid` → `grantTopupIfNew`; refund → `revokeTopupByOrderId`.
- Stacking: pack bonuses ≤ 90/hour; one Overload/hour.
- **Regen:** Rare/Epic/Anomaly refill **+1/+2/+3 every 6 minutes** toward the hour cap (not above it). Free = 0. See `src/lib/ranked-regen.ts`.
- Ops: create three **one-time** public Polar products with metadata `kind=topup`, `topup_sku`, `bonus_rolls`, `is_overload`; set env product ids (placeholders ship in code until then).

## Founder checklist

1. ~~Polar identity verification / KYC~~ done
2. ~~Connect payout / bank~~ done
3. ~~Submit account for Polar review~~ done (`status: active`)
4. ~~Flip draft products to public~~ done
5. Re-enable webhook endpoint if Polar auto-disabled after failed deliveries
6. ~~Build branded checkout~~ done (Account Ranked Plus / Checkout Sessions — P2)
7. ~~Hour-scoped top-ups / Overload + Plus regen~~ done (P3) — create Polar one-time products + set `POLAR_PRODUCT_BOOST_*` / `OVERLOAD` in Vercel

Stay on Polar **Starter** fees until volume justifies Pro.
