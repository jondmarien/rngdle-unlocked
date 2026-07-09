import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import type { RarityTier } from '../../game';
import { celebrateIntensity } from '../../game/fx';
import { useGame } from '../../state/GameProvider';

type Burst = {
  id: number;
  rarity: RarityTier;
  intensity: 1 | 2 | 3 | 4;
};

const PALETTES: Record<
  'rare' | 'epic' | 'anomaly' | 'mythic',
  string[]
> = {
  rare: ['#3b82f6', '#60a5fa', '#93c5fd', '#38bdf8', '#e0f2fe'],
  epic: ['#7c3aed', '#a78bfa', '#c4b5fd', '#8b5cf6', '#ddd6fe', '#f5f3ff'],
  anomaly: ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#c026d3', '#e879f9'],
  mythic: [
    '#db2777',
    '#f472b6',
    '#fbbf24',
    '#f59e0b',
    '#a855f7',
    '#fde68a',
    '#ffffff',
  ],
};

/**
 * Tiered settle FX: confetti + edge blooms + optional screen shake.
 * Epic → Anomaly → Mythic escalate mass, color, and camera energy.
 * GPU-friendly (transform/opacity only). Respects reduced-motion + settings.
 */
export function CelebrationLayer() {
  const { confettiToken, celebrateRarity, settings } = useGame();
  const [burst, setBurst] = useState<Burst | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (confettiToken === 0 || !settings.confettiEnabled) return;
    if (!celebrateRarity) return;
    const intensity = celebrateIntensity(celebrateRarity);
    if (intensity < 1) return;

    setBurst({
      id: confettiToken,
      rarity: celebrateRarity,
      intensity: intensity as 1 | 2 | 3 | 4,
    });

    // Body shake class for epic+
    const root = document.documentElement;
    if (!reduced && intensity >= 2) {
      root.classList.remove(
        'celebrate-shake-epic',
        'celebrate-shake-anomaly',
        'celebrate-shake-mythic',
      );
      // reflow to restart animation
      void root.offsetWidth;
      if (intensity === 2) root.classList.add('celebrate-shake-epic');
      else if (intensity === 3) root.classList.add('celebrate-shake-anomaly');
      else root.classList.add('celebrate-shake-mythic');
    }

    const clearMs =
      intensity >= 4 ? 5200 : intensity === 3 ? 4200 : intensity === 2 ? 3600 : 2800;
    const t = window.setTimeout(() => {
      setBurst(null);
      root.classList.remove(
        'celebrate-shake-epic',
        'celebrate-shake-anomaly',
        'celebrate-shake-mythic',
      );
    }, clearMs);
    return () => {
      window.clearTimeout(t);
      root.classList.remove(
        'celebrate-shake-epic',
        'celebrate-shake-anomaly',
        'celebrate-shake-mythic',
      );
    };
  }, [confettiToken, celebrateRarity, settings.confettiEnabled, reduced]);

  if (!burst || !settings.confettiEnabled || size.w === 0) return null;

  const palette =
    PALETTES[burst.rarity as keyof typeof PALETTES] ?? PALETTES.rare;
  const pieces =
    burst.intensity === 4
      ? 380
      : burst.intensity === 3
        ? 280
        : burst.intensity === 2
          ? 200
          : 140;
  const gravity =
    burst.intensity >= 3 ? 0.18 : burst.intensity === 2 ? 0.2 : 0.24;

  // Reduced motion: soft edge wash only, no confetti storm / shake
  if (reduced) {
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-[100] celebrate-edge celebrate-edge-${burst.rarity} celebrate-edge-soft`}
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden>
      {/* Edge blooms / vignette — escalate with tier */}
      <div
        className={`celebrate-edge celebrate-edge-${burst.rarity} absolute inset-0`}
      />
      {burst.intensity >= 3 && (
        <div className={`celebrate-flash celebrate-flash-${burst.rarity}`} />
      )}
      {burst.intensity >= 4 && (
        <>
          <div className="celebrate-ray celebrate-ray-a" />
          <div className="celebrate-ray celebrate-ray-b" />
          <div className="celebrate-sparkle-field" />
        </>
      )}

      <Confetti
        width={size.w}
        height={size.h}
        numberOfPieces={pieces}
        recycle={false}
        gravity={gravity}
        initialVelocityY={burst.intensity >= 3 ? 22 : 16}
        tweenDuration={burst.intensity >= 4 ? 280 : 360}
        colors={palette}
        confettiSource={{
          x: size.w / 2 - 10,
          y: size.h * 0.38,
          w: 20,
          h: 20,
        }}
      />

      {/* Second burst from mid-lower center for mythic */}
      {burst.intensity >= 4 && (
        <Confetti
          width={size.w}
          height={size.h}
          numberOfPieces={120}
          recycle={false}
          gravity={0.12}
          initialVelocityY={-18}
          colors={palette}
          confettiSource={{
            x: size.w / 2 - 12,
            y: size.h * 0.62,
            w: 24,
            h: 24,
          }}
        />
      )}
    </div>
  );
}
