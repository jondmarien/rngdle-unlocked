import { evaluateNumber } from '../src/game/evaluate.ts';
import { rollNumber } from '../src/game/rng.ts';
import { rarityFromEP } from '../src/game/rarity.ts';

const eps = [];
const N = 8000;
for (let i = 0; i < N; i++) {
  eps.push(evaluateNumber(await rollNumber()).totalEP);
}
eps.sort((a, b) => a - b);
const q = (p) =>
  eps[Math.min(eps.length - 1, Math.floor((p / 100) * (eps.length - 1)))];

const pts = [0, 2, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 97, 99, 99.5, 100];
console.log('quantiles');
for (const p of pts) console.log(`  p${p}: ${q(p)}`);

// Target cumulative: trash 18%, common 40%, uncommon 65%, rare 82%, epic 93%, anomaly 99%, mythic rest
const targets = [18, 40, 65, 82, 93, 99];
const thr = {
  uncommon: q(18), // min EP for uncommon = end of trash... wait
};
// minEP for each tier:
// trash: 0
// common: q(18)
// uncommon: q(40)
// rare: q(65)
// epic: q(82)
// anomaly: q(93)
// mythic: q(99)
const proposed = {
  common: q(18),
  uncommon: q(40),
  rare: q(65),
  epic: q(82),
  anomaly: q(93),
  mythic: q(99),
};
console.log('proposed minEP', proposed);

// round to nice numbers
const nice = {
  common: Math.round(proposed.common / 50) * 50,
  uncommon: Math.round(proposed.uncommon / 50) * 50,
  rare: Math.round(proposed.rare / 50) * 50,
  epic: Math.round(proposed.epic / 100) * 100,
  anomaly: Math.round(proposed.anomaly / 100) * 100,
  mythic: Math.round(proposed.mythic / 100) * 100,
};
console.log('nice minEP', nice);

function rarity(ep, t) {
  if (ep >= t.mythic) return 'mythic';
  if (ep >= t.anomaly) return 'anomaly';
  if (ep >= t.epic) return 'epic';
  if (ep >= t.rare) return 'rare';
  if (ep >= t.uncommon) return 'uncommon';
  if (ep >= t.common) return 'common';
  return 'trash';
}

const counts = {};
for (const ep of eps) {
  const r = rarity(ep, nice);
  counts[r] = (counts[r] || 0) + 1;
}
console.log(
  'rates with nice thresholds',
  Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, ((100 * v) / N).toFixed(1) + '%']),
  ),
);

// also try slightly hand-tuned
const hand = {
  common: 1100,
  uncommon: 1600,
  rare: 2400,
  epic: 4000,
  anomaly: 7500,
  mythic: 12000,
};
const c2 = {};
for (const ep of eps) {
  const r = rarity(ep, hand);
  c2[r] = (c2[r] || 0) + 1;
}
console.log(
  'rates hand',
  Object.fromEntries(
    Object.entries(c2).map(([k, v]) => [k, ((100 * v) / N).toFixed(1) + '%']),
  ),
);

const hand2 = {
  common: 1200,
  uncommon: 1700,
  rare: 2600,
  epic: 4200,
  anomaly: 7800,
  mythic: 11500,
};
const c3 = {};
for (const ep of eps) {
  const r = rarity(ep, hand2);
  c3[r] = (c3[r] || 0) + 1;
}
console.log(
  'rates hand2',
  Object.fromEntries(
    Object.entries(c3).map(([k, v]) => [k, ((100 * v) / N).toFixed(1) + '%']),
  ),
);
