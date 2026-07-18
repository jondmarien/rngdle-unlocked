# Polar monetization

RNGdle Unlocked uses [Polar](https://polar.sh) as Merchant of Record for optional Ranked subscription tiers (and later hour-scoped top-ups).

Player-facing disclosure: [`/payments`](https://rngdle-unlocked.chron0.tech/payments). Architecture diagram: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (Polar entitlements section).

## Env vars (names only)

| Variable               | Where           | Purpose                             |
| ---------------------- | --------------- | ----------------------------------- |
| `POLAR_API_KEY`        | server / Vercel | Outbound Polar API (checkout later) |
| `POLAR_WEBHOOK_SECRET` | server / Vercel | Verify inbound webhook signatures   |

Never expose these to the Vite client. Documented in `.env.example` without values.

## Webhook

- URL: `https://rngdle-unlocked.chron0.tech/api/webhooks/polar`
- Format: raw JSON
- Handler: [`api/webhooks/polar.ts`](../api/webhooks/polar.ts) → [`server/polar/webhooks.ts`](../server/polar/webhooks.ts)
- Verify: `@polar-sh/sdk` `validateEvent` + `POLAR_WEBHOOK_SECRET`
- Idempotency: `polar_webhook_events.webhook_id` (Standard Webhooks `webhook-id` header)
- Entitlements: [`server/polar/entitlements.ts`](../server/polar/entitlements.ts) → `user_entitlements`

Key events: `order.paid`, `order.refunded`, `subscription.created|active|updated|canceled|revoked|past_due`, `customer.created|updated`. Extra subscribed events are ignored safely.

Until the handler returns 2xx, Polar may retry/fail deliveries — expected pre-deploy.

## Ranked quota tiers

| Tier    | Rolls / UTC hour | Polar product (draft) | CAD / month |
| ------- | ---------------- | --------------------- | ----------- |
| Free    | 90               | —                     | —           |
| Rare    | 120              | RNGdle Rare           | CA$4.99     |
| Epic    | 150              | RNGdle Epic           | CA$9.99     |
| Anomaly | 180              | RNGdle Anomaly        | CA$14.99    |

Constants: [`src/lib/ranked-limits.ts`](../src/lib/ranked-limits.ts) (`RANKED_ROLLS_PER_HOUR`, `RANKED_TIER_CAPS`).

Product metadata (required for webhook mapping):

- `tier`: `rare` | `epic` | `anomaly`
- `ranked_rolls_per_hour`: `120` | `150` | `180`

Checkout must set Polar customer `external_id` = Better Auth `user.id`.

## Schema / migration

Additive script: `node --env-file=.env.local scripts/migrate-polar-entitlements.mjs`

Tables: `user_entitlements`, `polar_webhook_events`, `ranked_topups` (phase 2 stub).

## Top-ups (not created yet)

When approved: one-time products for partial refill / full refill / Overload. All bonuses are keyed by `utc_hour_start` and **do not rollover**. Purchase UI must show UTC hour remaining + explicit non-rollover copy (especially Overload).

## Founder checklist (not automated)

1. Polar identity verification / KYC
2. Connect payout / bank
3. Submit account for Polar review (one-way)
4. Flip draft products to public when `checkout_payments` is enabled
5. Re-enable webhook endpoint if Polar auto-disabled after failed deliveries

Stay on Polar **Starter** fees until volume justifies Pro.
