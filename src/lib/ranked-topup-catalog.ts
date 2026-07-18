/**
 * Player-facing Ranked hour top-up copy (Boost / Overload).
 */

import type { TopupSku } from './ranked-topups';

export const RANKED_TOPUP_CATALOG: readonly {
  sku: TopupSku;
  label: string;
  bonusRolls: number;
  priceCad: string;
  isOverload: boolean;
  blurb: string;
}[] = [
  {
    sku: 'boost_30',
    label: 'Boost +30',
    bonusRolls: 30,
    priceCad: 'CA$0.99',
    isOverload: false,
    blurb: 'Add 30 Ranked rolls to this UTC hour only.',
  },
  {
    sku: 'boost_60',
    label: 'Boost +60',
    bonusRolls: 60,
    priceCad: 'CA$1.79',
    isOverload: false,
    blurb: 'Add 60 Ranked rolls to this UTC hour only.',
  },
  {
    sku: 'overload',
    label: 'Overload +90',
    bonusRolls: 90,
    priceCad: 'CA$2.99',
    isOverload: true,
    blurb: 'Raise this hour’s ceiling by 90. No rollover.',
  },
] as const;

export const TOPUP_NON_ROLLOVER =
  'Expires at the end of this UTC hour — unused bonus does not roll over.';
