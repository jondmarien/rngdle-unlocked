import type { RarityTier } from './types.js';

/** Soft Web Audio blip — no asset files required. */
export function playRollSound(rarity: RarityTier, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);

    const tierFreq: Record<RarityTier, number> = {
      trash: 220,
      common: 330,
      uncommon: 392,
      rare: 523,
      epic: 659,
      anomaly: 784,
      mythic: 988,
    };
    o.type = rarity === 'mythic' || rarity === 'anomaly' ? 'triangle' : 'sine';
    o.frequency.value = tierFreq[rarity];
    g.gain.value = 0.0001;
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.start(t);
    o.stop(t + 0.4);
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
    rarity === 'mythic'
  );
}
