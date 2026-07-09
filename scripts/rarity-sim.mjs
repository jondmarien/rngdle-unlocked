/**
 * Quick rarity distribution sim (loads game via vitest/vite-like path).
 * Run: pnpm exec tsx scripts/rarity-sim.mts
 */
import { evaluateNumber } from '../src/game/evaluate.ts';
import { rollNumber } from '../src/game/rng.ts';

const counts = {
  trash: 0,
  common: 0,
  uncommon: 0,
  rare: 0,
  epic: 0,
  anomaly: 0,
  mythic: 0,
};
const eps = [];
const N = 5000;

for (let i = 0; i < N; i++) {
  const n = await rollNumber();
  const r = evaluateNumber(n);
  counts[r.rarity]++;
  eps.push(r.totalEP);
}

eps.sort((a, b) => a - b);
const q = (p) => eps[Math.floor((p / 100) * (eps.length - 1))];

console.log('n=', N);
console.log(counts);
console.log(
  'rates',
  Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [
      k,
      ((100 * v) / N).toFixed(2) + '%',
    ]),
  ),
);
console.log(
  'EP quantiles 0,1,5,10,25,50,75,90,99,100:',
  [0, 1, 5, 10, 25, 50, 75, 90, 99, 100].map((p) => q(p)),
);

for (const min of [40, 220, 700, 1800, 4500, 12000]) {
  const below = eps.filter((e) => e < min).length;
  console.log(`EP < ${min}: ${((100 * below) / N).toFixed(2)}%`);
}

let trashSamples = 0;
let commonSamples = 0;
for (let i = 0; i < 30_000 && (trashSamples < 3 || commonSamples < 3); i++) {
  const n = await rollNumber();
  const r = evaluateNumber(n);
  if (r.totalEP < 40 && trashSamples < 3) {
    console.log(
      'TRASH',
      n,
      r.totalEP,
      r.badges.map((b) => `${b.name}(${b.ep})`).join(' + ') || '(no badges)',
    );
    trashSamples++;
  } else if (r.totalEP >= 40 && r.totalEP < 220 && commonSamples < 3) {
    console.log(
      'COMMON',
      n,
      r.totalEP,
      r.badges.map((b) => `${b.name}(${b.ep})`).join(' + '),
    );
    commonSamples++;
  }
}
