/**
 * Ranked hour top-up Polar product id map (server env overrides).
 */

export {
  assertTopupAllowed,
  bonusRollsForSku,
  isOverloadSku,
  isTopupSku,
  summarizeTopupRows,
  TOPUP_PACK_BONUS_CAP,
  TOPUP_SKUS,
  topupSkuFromMetadata,
  type TopupAllowed,
  type TopupHourState,
  type TopupSku,
} from '../../src/lib/ranked-topups.js';

import type { TopupSku } from '../../src/lib/ranked-topups.js';

const DEFAULT_PRODUCT_IDS: Record<TopupSku, string> = {
  // Placeholder UUIDs — override via env after creating Polar one-time products.
  boost_30: '00000000-0000-4000-8000-00000000b030',
  boost_60: '00000000-0000-4000-8000-00000000b060',
  overload: '00000000-0000-4000-8000-00000000ov90',
};

export function productIdForTopupSku(sku: TopupSku): string {
  if (sku === 'boost_30') {
    return (
      process.env.POLAR_PRODUCT_BOOST_30?.trim() || DEFAULT_PRODUCT_IDS.boost_30
    );
  }
  if (sku === 'boost_60') {
    return (
      process.env.POLAR_PRODUCT_BOOST_60?.trim() || DEFAULT_PRODUCT_IDS.boost_60
    );
  }
  return (
    process.env.POLAR_PRODUCT_OVERLOAD?.trim() || DEFAULT_PRODUCT_IDS.overload
  );
}
