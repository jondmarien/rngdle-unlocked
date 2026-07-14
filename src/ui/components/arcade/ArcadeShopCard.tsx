import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { ArcadeUpgradeId } from '../../../game/arcade';
import { ARCADE_UPGRADES } from '../../../game/arcade';
import { ARCADE_SHOP_TEXTURE } from '../../../lib/arcade-icons';
import { MOTION_EASE, MOTION_MS } from '../../motion/tokens';

/**
 * Shop offer card — category texture, Motion hover/press, buy flash, unaffordable shake.
 * Does not call buy when unaffordable (presentation-only deny feedback).
 * CSS buy/deny keyframes left in global.css but unused here (avoid double-animation).
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
  const reduceMotion = useReducedMotion();
  const [denyTick, setDenyTick] = useState(0);
  const [buyTick, setBuyTick] = useState(0);

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

  const interactive = canBuy && !busy;
  const buying = buyTick > 0;
  const denying = denyTick > 0;

  return (
    <motion.li
      className="arcade-shop-card flex flex-col rounded-md border border-(--outline) px-3 py-2 text-sm"
      style={{ ['--arcade-shop-bg' as string]: `url(${texture})` }}
      whileHover={
        reduceMotion || !interactive
          ? undefined
          : {
              y: -2,
              scale: 1.02,
              transition: {
                duration: MOTION_MS.hover / 1000,
                ease: MOTION_EASE,
              },
            }
      }
      whileTap={
        reduceMotion || !interactive
          ? undefined
          : {
              scale: 0.98,
              transition: {
                duration: MOTION_MS.press / 1000,
                ease: MOTION_EASE,
              },
            }
      }
      animate={
        reduceMotion
          ? { scale: 1, x: 0, opacity: 1 }
          : buying
            ? { scale: [1, 1.04, 1], x: 0, opacity: 1 }
            : denying
              ? { x: [0, -3, 3, -2, 0], scale: 1, opacity: 0.72 }
              : { scale: 1, x: 0, opacity: 1 }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : buying
            ? { duration: 0.35, ease: MOTION_EASE }
            : denying
              ? { duration: 0.35, ease: MOTION_EASE }
              : { duration: MOTION_MS.quick / 1000, ease: MOTION_EASE }
      }
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
    </motion.li>
  );
}
