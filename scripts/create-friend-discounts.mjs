/**
 * Create 5× 100% forever friend discount codes for Ranked Plus subs.
 * Codes print to stdout only — do NOT commit them.
 *
 * Usage: node --env-file=.env.local scripts/create-friend-discounts.mjs
 */
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { Polar } from '@polar-sh/sdk';

config({ path: '.env.local' });
config({ path: '.env' });

const accessToken = process.env.POLAR_API_KEY;
if (!accessToken) {
  console.error('POLAR_API_KEY missing');
  process.exit(1);
}

const PRODUCT_IDS = [
  'aa1bfa37-6c5f-4b68-bed4-e3dc234f9154', // Rare
  '5bf21411-bf97-4a6a-aa7d-2d08c0c5d7d8', // Epic
  'd988c23d-3d3e-40ae-b68e-5179645b65b6', // Anomaly
];

const polar = new Polar({ accessToken });

const codes = [];
for (let i = 1; i <= 5; i++) {
  const code = randomBytes(8).toString('hex');
  const discount = await polar.discounts.create({
    type: 'percentage',
    duration: 'forever',
    basisPoints: 10_000,
    name: `Friend pass ${i}`,
    code,
    products: PRODUCT_IDS,
  });
  codes.push({
    name: discount.name,
    code: discount.code ?? code,
    id: discount.id,
  });
  console.log(`ok: ${discount.name} → ${discount.code ?? code}`);
}

console.log('\n--- Friend discount codes (save privately; do not commit) ---');
for (const c of codes) {
  console.log(`${c.name}: ${c.code}`);
}
