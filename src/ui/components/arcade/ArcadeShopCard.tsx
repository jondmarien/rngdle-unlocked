import { useEffect, useState } from 'react';
import type { ArcadeUpgradeId } from '../../../game/arcade';
import { ARCADE_UPGRADES } from '../../../game/arcade';
import { ARCADE_SHOP_TEXTURE } from '../../../lib/arcade-icons';

/**
 * Shop offer card — category texture, hover lift, buy flash, unaffordable shake.
 * Does not call buy when unaffordable (presentation-only deny feedback).
 */
export function ArcadeShopCard({
  upgradeId,
  price,
  canBuy,
  busy,
  onBuy,
}: {
  upgradeId: ArcadeUpgradeId;
  price: number;
  canBuy: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const def = ARCADE_UPGRADES[upgradeId];
  const texture =
    def.type === 'active'
      ? ARCADE_SHOP_TEXTURE.active
      : ARCADE_SHOP_TEXTURE.passive;
  const [denyTick, setDenyTick] = useState(0);
  const [buyTick, setBuyTick] = useState(0);

  const denyClass = denyTick > 0 ? 'arcade-shop-card-deny' : '';
  const buyClass = buyTick > 0 ? 'arcade-shop-card-buy' : '';

  useEffect(() => {
    if (denyTick === 0) return;
    const t = window.setTimeout(() => setDenyTick(0), 400);
    return () => window.clearTimeout(t);
  }, [denyTick]);

  useEffect(() => {
    if (buyTick === 0) return;
    const t = window.setTimeout(() => setBuyTick(0), 500);
    return () => window.clearTimeout(t);
  }, [buyTick]);

  return (
    <li
      className={`arcade-shop-card flex flex-col rounded-md border border-(--outline) px-3 py-2 text-sm ${
        canBuy && !busy ? 'arcade-shop-card-affordable' : ''
      } ${denyClass} ${buyClass}`}
      style={{ ['--arcade-shop-bg' as string]: `url(${texture})` }}
    >
      <span className="font-semibold">{def.name}</span>
      <span className="text-xs text-(--prose-3)">{def.type}</span>
      <p className="mt-1 flex-1 text-xs text-(--prose-2)">{def.description}</p>
      <button
        type="button"
        disabled={busy}
        aria-disabled={!canBuy || busy}
        className={`mt-2 rounded-md border border-(--prose) px-2 py-1.5 text-xs font-bold ${
          !canBuy ? 'opacity-40' : ''
        } disabled:opacity-40`}
        onClick={() => {
          if (busy) return;
          if (!canBuy) {
            setDenyTick((n) => n + 1);
            return;
          }
          setBuyTick((n) => n + 1);
          onBuy();
        }}
      >
        Buy · {price} Digits
      </button>
    </li>
  );
}
