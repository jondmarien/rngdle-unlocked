import type { RarityTier } from './types.js';

/** Soft Web Audio blip — no asset files required. Escalates for epic+. */
export function playRollSound(rarity: RarityTier, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;

    const blip = (
      freq: number,
      type: OscillatorType,
      start: number,
      dur: number,
      peak: number,
    ) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.start(start);
      o.stop(start + dur + 0.02);
    };

    if (rarity === 'divine') {
      blip(523, 'triangle', t0, 0.2, 0.07);
      blip(659, 'triangle', t0 + 0.07, 0.26, 0.09);
      blip(784, 'sine', t0 + 0.14, 0.32, 0.1);
      blip(1046, 'sine', t0 + 0.24, 0.4, 0.09);
      blip(1319, 'sine', t0 + 0.36, 0.5, 0.07);
      window.setTimeout(() => void ctx.close(), 1000);
      return;
    }
    if (rarity === 'mythic') {
      // Rising triad + shimmer
      blip(523, 'triangle', t0, 0.22, 0.07);
      blip(659, 'triangle', t0 + 0.08, 0.28, 0.09);
      blip(784, 'sine', t0 + 0.16, 0.35, 0.1);
      blip(1046, 'sine', t0 + 0.28, 0.45, 0.08);
      window.setTimeout(() => void ctx.close(), 900);
      return;
    }
    if (rarity === 'anomaly') {
      blip(440, 'sawtooth', t0, 0.12, 0.05);
      blip(660, 'triangle', t0 + 0.07, 0.28, 0.09);
      blip(880, 'triangle', t0 + 0.18, 0.38, 0.07);
      window.setTimeout(() => void ctx.close(), 700);
      return;
    }
    if (rarity === 'epic') {
      blip(523, 'sine', t0, 0.2, 0.07);
      blip(698, 'triangle', t0 + 0.1, 0.32, 0.08);
      window.setTimeout(() => void ctx.close(), 600);
      return;
    }

    const tierFreq: Record<RarityTier, number> = {
      trash: 220,
      common: 330,
      uncommon: 392,
      rare: 523,
      epic: 659,
      anomaly: 784,
      mythic: 988,
      divine: 1175,
    };
    blip(tierFreq[rarity], 'sine', t0, 0.35, 0.08);
    window.setTimeout(() => void ctx.close(), 500);
  } catch {
    // ignore autoplay / missing audio
  }
}

export function shouldCelebrate(rarity: RarityTier): boolean {
  return (
    rarity === 'rare' ||
    rarity === 'epic' ||
    rarity === 'anomaly' ||
    rarity === 'mythic' ||
    rarity === 'divine'
  );
}

/** Trash settle gets its own cracked-screen FX (separate settings toggle). */
export function shouldTrashCrack(rarity: RarityTier): boolean {
  return rarity === 'trash';
}

/** Intensity ladder for screen FX (0 = none, 'trash' = crack + heavy shake). */
export function celebrateIntensity(
  rarity: RarityTier,
): 0 | 1 | 2 | 3 | 4 | 5 | 'trash' {
  switch (rarity) {
    case 'trash':
      return 'trash';
    case 'rare':
      return 1;
    case 'epic':
      return 2;
    case 'anomaly':
      return 3;
    case 'mythic':
      return 4;
    case 'divine':
      return 5;
    default:
      return 0;
  }
}
