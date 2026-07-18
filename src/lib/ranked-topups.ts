/**
 * Ranked hour top-up SKU math (shared client + server).
 */

export type TopupSku = 'boost_30' | 'boost_60' | 'overload';

export const TOPUP_SKUS: readonly TopupSku[] = [
  'boost_30',
  'boost_60',
  'overload',
] as const;

/** Max sum of non-overload pack bonuses per UTC hour. */
export const TOPUP_PACK_BONUS_CAP = 90;

export function isTopupSku(v: string): v is TopupSku {
  return v === 'boost_30' || v === 'boost_60' || v === 'overload';
}

export function bonusRollsForSku(sku: TopupSku): number {
  if (sku === 'boost_30') return 30;
  if (sku === 'boost_60') return 60;
  return 90;
}

export function isOverloadSku(sku: TopupSku): boolean {
  return sku === 'overload';
}

export function topupSkuFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): TopupSku | null {
  if (!metadata) return null;
  const kind = metadata.kind;
  if (kind != null && kind !== 'topup') return null;
  const skuRaw = metadata.topup_sku ?? metadata.topupSku;
  if (typeof skuRaw === 'string' && isTopupSku(skuRaw)) return skuRaw;
  const isOverload =
    metadata.is_overload === true ||
    metadata.is_overload === 'true' ||
    metadata.isOverload === true;
  const bonusRaw = metadata.bonus_rolls ?? metadata.bonusRolls;
  const bonus =
    typeof bonusRaw === 'number'
      ? bonusRaw
      : typeof bonusRaw === 'string'
        ? Number(bonusRaw)
        : NaN;
  if (isOverload && bonus === 90) return 'overload';
  if (!isOverload && bonus === 30) return 'boost_30';
  if (!isOverload && bonus === 60) return 'boost_60';
  return null;
}

export type TopupHourState = {
  packBonus: number;
  hasOverload: boolean;
  totalBonus: number;
};

export function summarizeTopupRows(
  rows: readonly { bonus: number; overload: boolean }[],
): TopupHourState {
  let packBonus = 0;
  let overloadBonus = 0;
  let hasOverload = false;
  for (const r of rows) {
    const b = Math.max(0, r.bonus ?? 0);
    if (r.overload) {
      hasOverload = true;
      overloadBonus += b;
    } else {
      packBonus += b;
    }
  }
  return {
    packBonus,
    hasOverload,
    totalBonus: packBonus + overloadBonus,
  };
}

export type TopupAllowed =
  | { ok: true }
  | { ok: false; code: 'pack_cap' | 'overload_already'; reason: string };

/** Pure stacking check for a proposed SKU against current-hour state. */
export function assertTopupAllowed(
  state: TopupHourState,
  sku: TopupSku,
): TopupAllowed {
  if (isOverloadSku(sku)) {
    if (state.hasOverload) {
      return {
        ok: false,
        code: 'overload_already',
        reason: 'You already have Overload for this UTC hour.',
      };
    }
    return { ok: true };
  }
  const next = state.packBonus + bonusRollsForSku(sku);
  if (next > TOPUP_PACK_BONUS_CAP) {
    return {
      ok: false,
      code: 'pack_cap',
      reason: `Boost packs are capped at +${TOPUP_PACK_BONUS_CAP} rolls this UTC hour.`,
    };
  }
  return { ok: true };
}
