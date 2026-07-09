import { ROLL_MAX } from '../rng';

/**
 * Natural decimal digits (no pad). Integer properties use this.
 * The reel may still *display* leading zeros via formatRollDigits.
 */
export function digitsOf(n: number): string {
  return String(n);
}

export function digitArray(n: number): number[] {
  return digitsOf(n).split('').map((c) => Number(c));
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function isPalindrome(n: number): boolean {
  const s = digitsOf(n);
  if (s.length < 2) return false;
  return s === [...s].reverse().join('');
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function isPerfectPower(n: number, exp: number): boolean {
  if (n < 2) return false;
  const root = Math.round(n ** (1 / exp));
  return root ** exp === n;
}

const FIB = (() => {
  const set = new Set<number>([0, 1]);
  let a = 0;
  let b = 1;
  while (b <= ROLL_MAX) {
    const c = a + b;
    if (c > ROLL_MAX) break;
    set.add(c);
    a = b;
    b = c;
  }
  return set;
})();

export function isFibonacci(n: number): boolean {
  return FIB.has(n);
}

export function isHarshad(n: number): boolean {
  if (n === 0) return false;
  const sum = digitArray(n).reduce((a, d) => a + d, 0);
  return sum > 0 && n % sum === 0;
}

export function isAllSameDigits(n: number): boolean {
  const s = digitsOf(n);
  if (s.length < 2) return false;
  return s.split('').every((c) => c === s[0]);
}

export function isStrictlyAscending(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) {
    if (d[i]! <= d[i - 1]!) return false;
  }
  return true;
}

export function isStrictlyDescending(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) {
    if (d[i]! >= d[i - 1]!) return false;
  }
  return true;
}

export function isAlternating(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 4) return false;
  for (let i = 2; i < d.length; i++) {
    if (d[i] !== d[i - 2]) return false;
  }
  return d[0] !== d[1];
}

export function hasBookends(n: number): boolean {
  const s = digitsOf(n);
  return s.length >= 3 && s[0] === s[s.length - 1];
}

export function zeroCount(n: number): number {
  return digitArray(n).filter((d) => d === 0).length;
}

export function digitCounts(n: number): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of digitArray(n)) {
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

export function pokerHand(n: number): 'pair' | 'two-pair' | 'trips' | 'full-house' | 'quads' | 'five' | null {
  const counts = [...digitCounts(n).values()].sort((a, b) => b - a);
  if (counts[0] === 5) return 'five';
  if (counts[0] === 4) return 'quads';
  if (counts[0] === 3 && counts[1] === 2) return 'full-house';
  if (counts[0] === 3) return 'trips';
  if (counts[0] === 2 && counts[1] === 2) return 'two-pair';
  if (counts[0] === 2) return 'pair';
  return null;
}

export function longestRun(n: number): number {
  const d = digitArray(n);
  let best = 1;
  let cur = 1;
  for (let i = 1; i < d.length; i++) {
    if (d[i] === d[i - 1]) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

export function isEven(n: number): boolean {
  return n % 2 === 0;
}

/** Natural (unpadded) length — e.g. 42 → 2, not 7. */
export function digitLength(n: number): number {
  return String(n).length;
}
