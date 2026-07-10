import { ROLL_MAX } from '../rng.js';

export function digitsOf(n: number): string {
  return String(n);
}

export function digitArray(n: number): number[] {
  return digitsOf(n)
    .split('')
    .map((c) => Number(c));
}

export function digitLength(n: number): number {
  return String(n).length;
}

export function digitSum(n: number): number {
  return digitArray(n).reduce((a, d) => a + d, 0);
}

export function digitProduct(n: number): number {
  const d = digitArray(n);
  if (d.includes(0)) return 0;
  return d.reduce((a, x) => a * x, 1);
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

/** Square triangular numbers (also Fibonacci-ish curiosities). */
const TRIANGULAR = (() => {
  const set = new Set<number>();
  for (let k = 0; ; k++) {
    const t = (k * (k + 1)) / 2;
    if (t > ROLL_MAX) break;
    set.add(t);
  }
  return set;
})();

export function isTriangular(n: number): boolean {
  return TRIANGULAR.has(n);
}

export function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

export function isCube(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(n ** (1 / 3));
  return r * r * r === n;
}

/** n = k(k+1) — pronic / oblong. */
export function isPronic(n: number): boolean {
  if (n < 0) return false;
  const k = Math.floor(Math.sqrt(n));
  return k * (k + 1) === n || (k + 1) * (k + 2) === n;
}

export function isHarshad(n: number): boolean {
  if (n === 0) return false;
  const sum = digitSum(n);
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

export function isNonDecreasing(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) {
    if (d[i]! < d[i - 1]!) return false;
  }
  return true;
}

export function isNonIncreasing(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) {
    if (d[i]! > d[i - 1]!) return false;
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
  return s.length >= 2 && s[0] === s[s.length - 1];
}

export function zeroCount(n: number): number {
  return digitArray(n).filter((d) => d === 0).length;
}

export function countDigit(n: number, digit: number): number {
  return digitArray(n).filter((d) => d === digit).length;
}

export function digitCounts(n: number): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of digitArray(n)) {
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

export function pokerHand(
  n: number,
):
  | 'pair'
  | 'two-pair'
  | 'three-pair'
  | 'trips'
  | 'two-trips'
  | 'full-house'
  | 'quads'
  | 'full-quads'
  | 'five'
  | 'six'
  | null {
  const counts = [...digitCounts(n).values()].sort((a, b) => b - a);
  if (counts[0] === 6) return 'six';
  if (counts[0] === 5) return 'five';
  if (counts[0] === 4 && counts[1] === 2) return 'full-quads';
  if (counts[0] === 4) return 'quads';
  if (counts[0] === 3 && counts[1] === 3) return 'two-trips';
  if (counts[0] === 3 && counts[1] === 2) return 'full-house';
  if (counts[0] === 3) return 'trips';
  if (counts[0] === 2 && counts[1] === 2 && counts[2] === 2)
    return 'three-pair';
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

export function isOdd(n: number): boolean {
  return n % 2 === 1;
}

/** First half equals reverse of second half (even length) or near (odd). */
export function isMirroredHalves(n: number): boolean {
  const s = digitsOf(n);
  if (s.length < 4) return false;
  const mid = Math.floor(s.length / 2);
  const left = s.slice(0, mid);
  const right = s
    .slice(s.length - mid)
    .split('')
    .reverse()
    .join('');
  return left === right;
}

export function startsWith(n: number, prefix: string): boolean {
  return digitsOf(n).startsWith(prefix);
}

export function endsWith(n: number, suffix: string): boolean {
  return digitsOf(n).endsWith(suffix);
}

export function contains(n: number, sub: string): boolean {
  return digitsOf(n).includes(sub);
}

/** Mountain: increases then decreases (strict), length ≥ 3. */
export function isMountain(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  let i = 1;
  while (i < d.length && d[i]! > d[i - 1]!) i++;
  if (i === 1 || i === d.length) return false;
  while (i < d.length && d[i]! < d[i - 1]!) i++;
  return i === d.length;
}

/** Valley: decreases then increases. */
export function isValley(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  let i = 1;
  while (i < d.length && d[i]! < d[i - 1]!) i++;
  if (i === 1 || i === d.length) return false;
  while (i < d.length && d[i]! > d[i - 1]!) i++;
  return i === d.length;
}

/** All digits even (0,2,4,6,8). */
export function allEvenDigits(n: number): boolean {
  const d = digitArray(n);
  return d.length >= 2 && d.every((x) => x % 2 === 0);
}

export function allOddDigits(n: number): boolean {
  const d = digitArray(n);
  return d.length >= 2 && d.every((x) => x % 2 === 1);
}

/** Sum of first half equals sum of second half. */
export function isBalanced(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 2) return false;
  const mid = Math.floor(d.length / 2);
  const left = d.slice(0, mid).reduce((a, b) => a + b, 0);
  const right = d.slice(d.length - mid).reduce((a, b) => a + b, 0);
  return left === right;
}

export function maxDigit(n: number): number {
  return Math.max(...digitArray(n));
}

export function minDigit(n: number): number {
  return Math.min(...digitArray(n));
}

/** Adjacent digits differ by exactly 1 everywhere. */
export function isSmoothStep(n: number): boolean {
  const d = digitArray(n);
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) {
    if (Math.abs(d[i]! - d[i - 1]!) !== 1) return false;
  }
  return true;
}

/** No digit repeats. */
export function allUniqueDigits(n: number): boolean {
  const d = digitArray(n);
  return d.length >= 3 && new Set(d).size === d.length;
}

export function isDivisibleBy(n: number, k: number): boolean {
  return n > 0 && n % k === 0;
}

/** Repeating block like 121212, 123123. */
export function isRepeatingBlock(n: number): boolean {
  const s = digitsOf(n);
  if (s.length < 4) return false;
  for (let block = 1; block <= Math.floor(s.length / 2); block++) {
    if (s.length % block !== 0) continue;
    const unit = s.slice(0, block);
    if (unit.repeat(s.length / block) === s && s.length / block >= 2) {
      return true;
    }
  }
  return false;
}

/** Clock-ish: valid HHMM as 4 digits 0000-2359, or embedded. */
export function looksLikeTime(n: number): boolean {
  const s = digitsOf(n);
  if (s.length === 4) {
    const hh = Number(s.slice(0, 2));
    const mm = Number(s.slice(2, 4));
    return hh <= 23 && mm <= 59;
  }
  if (s.length === 3) {
    // hmm e.g. 930
    const h = Number(s[0]);
    const mm = Number(s.slice(1));
    return h <= 9 && mm <= 59;
  }
  return false;
}

export function looksLikeYear(n: number): boolean {
  return n >= 1900 && n <= 2099;
}

export function isFactorialDigitSum(n: number): boolean {
  // 145 = 1!+4!+5!, 40585, etc. — rare curiosities we hardcode known ≤ 1e6
  return n === 1 || n === 2 || n === 145 || n === 40585;
}

/** Hamming weight — number of 1-bits in binary representation. */
export function popcount(n: number): number {
  let x = n >>> 0;
  let c = 0;
  while (x) {
    c += x & 1;
    x >>>= 1;
  }
  return c;
}

export function isBinaryPalindromeForm(n: number): boolean {
  const s = n.toString(2);
  return s.length >= 2 && s === [...s].reverse().join('');
}

export function isHexPalindromeForm(n: number): boolean {
  const s = n.toString(16);
  return s.length >= 2 && s === [...s].reverse().join('');
}

export function isOctalPalindromeForm(n: number): boolean {
  const s = n.toString(8);
  return s.length >= 2 && s === [...s].reverse().join('');
}

/** Hex has a consecutive repeated digit (e.g. ff, aa, 00). */
export function isHexTwin(n: number): boolean {
  const s = n.toString(16);
  return s.length >= 2 && /(.)\1/.test(s);
}

export function isHexRepdigit(n: number): boolean {
  const s = n.toString(16);
  return s.length >= 2 && /^([0-9a-f])\1+$/.test(s);
}

/** Binary representation is all 1-bits (Mersenne number 2^k−1). */
export function isAllOnesBinary(n: number): boolean {
  return n > 0 && /^1+$/.test(n.toString(2));
}

/** Curated hex-speak words reachable at ≤ ROLL_MAX. */
export const HEX_SPEAK_WORDS = [
  'dead',
  'beef',
  'cafe',
  'babe',
  'face',
  'fade',
  'deed',
  'feed',
  'bead',
  'deaf',
  'bade',
  'aced',
  'c0de',
  'd00d',
  'f00d',
  'b00b',
] as const;

export function hexSpeakWord(n: number): string | undefined {
  const h = n.toString(16);
  return HEX_SPEAK_WORDS.find((w) => h.includes(w));
}

export function hasHexSpeak(n: number): boolean {
  return hexSpeakWord(n) !== undefined;
}
