/**
 * Badge equation proofs for cards (Workstreams D + E).
 * Pure helpers — no scoring side effects.
 */

import { digitArray, digitSum } from './matchers.js';

export type ProductEquation = {
  kind?: 'product';
  divisor: number;
  quotient: number;
};

export type PowerEquation = {
  kind: 'power';
  base: number;
  exponent: number;
};

export type PronicEquation = {
  kind: 'pronic';
  k: number;
};

export type DigitSumEquation = {
  kind: 'digitSum';
  digits: readonly number[];
  total: number;
  compare?: 'eq' | 'gte' | 'lte';
  threshold?: number;
};

export type BadgeEquation =
  | ProductEquation
  | PowerEquation
  | PronicEquation
  | DigitSumEquation;

const FIXED_DIVISORS: Readonly<Record<string, number>> = {
  div3: 3,
  div4: 4,
  div5: 5,
  div7: 7,
  div8: 8,
  div9: 9,
  div11: 11,
  div12: 12,
  div13: 13,
  div25: 25,
  div100: 100,
  div1000: 1000,
};

function productEquation(
  n: number,
  divisor: number,
): ProductEquation | undefined {
  if (divisor <= 0 || n % divisor !== 0) return undefined;
  return { kind: 'product', divisor, quotient: n / divisor };
}

function powerRoot(n: number, exponent: number): number | undefined {
  if (n < 2 || exponent < 2) return undefined;
  const root = Math.round(n ** (1 / exponent));
  if (root ** exponent !== n) return undefined;
  return root;
}

/** Equation for a known badge id, or undefined. Safe for n = 0. */
export function equationForBadge(
  id: string,
  n: number,
): BadgeEquation | undefined {
  if (id === 'harshad') {
    if (n === 0) return undefined;
    const sum = digitSum(n);
    if (!sum) return undefined;
    return productEquation(n, sum);
  }
  const fixed = FIXED_DIVISORS[id];
  if (fixed !== undefined) return productEquation(n, fixed);

  if (id === 'square') return squareEquation(n);
  if (id === 'cube') return cubeEquation(n);
  if (id === 'fourth-power') return fourthPowerEquation(n);
  if (id === 'power-of-two') return powerOfTwoEquation(n);
  if (id === 'pronic') return pronicEquation(n);
  if (id === 'digit-sum-10') return digitSumEqEquation(n, 10);
  if (id === 'digit-sum-21') return digitSumEqEquation(n, 21);
  if (id === 'digit-sum-high') return digitSumCompareEquation(n, 'gte', 40);
  if (id === 'digit-sum-low') return digitSumCompareEquation(n, 'lte', 5);

  return undefined;
}

/** Catalog annotator factory for fixed-divisor badges. */
export function fixedDivEquation(
  divisor: number,
): (n: number) => BadgeEquation | undefined {
  return (n) => productEquation(n, divisor);
}

export function harshadEquation(n: number): BadgeEquation | undefined {
  return equationForBadge('harshad', n);
}

export function squareEquation(n: number): BadgeEquation | undefined {
  const base = powerRoot(n, 2);
  if (base === undefined) return undefined;
  return { kind: 'power', base, exponent: 2 };
}

export function cubeEquation(n: number): BadgeEquation | undefined {
  const base = powerRoot(n, 3);
  if (base === undefined) return undefined;
  return { kind: 'power', base, exponent: 3 };
}

export function fourthPowerEquation(n: number): BadgeEquation | undefined {
  const base = powerRoot(n, 4);
  if (base === undefined) return undefined;
  return { kind: 'power', base, exponent: 4 };
}

export function powerOfTwoEquation(n: number): BadgeEquation | undefined {
  if (n <= 0 || (n & (n - 1)) !== 0) return undefined;
  return { kind: 'power', base: 2, exponent: Math.log2(n) };
}

export function pronicEquation(n: number): BadgeEquation | undefined {
  if (n < 0) return undefined;
  const k = Math.floor(Math.sqrt(n));
  if (k * (k + 1) === n) return { kind: 'pronic', k };
  if ((k + 1) * (k + 2) === n) return { kind: 'pronic', k: k + 1 };
  return undefined;
}

function digitSumEqEquation(
  n: number,
  total: number,
): DigitSumEquation | undefined {
  const digits = digitArray(n);
  const sum = digits.reduce((a, d) => a + d, 0);
  if (sum !== total) return undefined;
  return { kind: 'digitSum', digits, total, compare: 'eq', threshold: total };
}

function digitSumCompareEquation(
  n: number,
  compare: 'gte' | 'lte',
  threshold: number,
): DigitSumEquation | undefined {
  const digits = digitArray(n);
  const total = digits.reduce((a, d) => a + d, 0);
  if (compare === 'gte' && total < threshold) return undefined;
  if (compare === 'lte' && total > threshold) return undefined;
  return { kind: 'digitSum', digits, total, compare, threshold };
}

export function digitSum10Equation(n: number): BadgeEquation | undefined {
  return digitSumEqEquation(n, 10);
}

export function digitSum21Equation(n: number): BadgeEquation | undefined {
  return digitSumEqEquation(n, 21);
}

export function digitSumHighEquation(n: number): BadgeEquation | undefined {
  return digitSumCompareEquation(n, 'gte', 40);
}

export function digitSumLowEquation(n: number): BadgeEquation | undefined {
  return digitSumCompareEquation(n, 'lte', 5);
}

/** True when equation is (or looks like) a legacy/v1 product proof. */
export function isProductEquation(eq: BadgeEquation): eq is ProductEquation {
  if (eq.kind === 'product') return true;
  if (eq.kind === undefined && 'divisor' in eq && 'quotient' in eq) return true;
  return false;
}
