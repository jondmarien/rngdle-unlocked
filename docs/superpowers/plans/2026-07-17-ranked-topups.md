# Ranked top-ups + regen Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkbox tracking lives in the Cursor plan todos.

**Goal:** Ship Polar P3 — Boost/Overload top-ups, Ranked Plus 6‑minute refill regen, shared timed accrual, Account CTA polish.

**Architecture:** One-time Polar Checkout Sessions grant `ranked_topups` rows; effective Ranked limit = tier + topups; remaining uses lazy regen against `rate_limits.count`. Extract `timedAccrual` for Arcade idle + Ranked.

**Tech Stack:** Vite/React, Vercel serverless, Polar SDK, Neon/Drizzle, existing `apiGuards` + checkout patterns.

---

### Task checklist

- [x] Design spec written
- [x] `timedAccrual` + Arcade idle refactor + Ranked regen helpers/tests
- [x] Wire regen into ranked quota peek/check + DTO
- [x] Top-up SKU map + `assertTopupAllowed`
- [x] `POST /api/checkout/topup` + client API
- [x] Webhook grant + refund revoke
- [x] Account CTAs + This-hour UI + RankedQuotaPill
- [x] Docs / README / polar-monetization P3
