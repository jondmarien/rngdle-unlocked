/**
 * Highlight helpers use natural decimal digits (String(n)).
 * BadgeCard maps highlights onto the same natural form from formatRollDigits.
 */
export function digitsStr(n: number): string {
  return String(n);
}

export function maskAll(n: number): boolean[] {
  return Array.from(digitsStr(n), () => true);
}

export function maskNone(n: number): boolean[] {
  return Array.from(digitsStr(n), () => false);
}

export function maskIndices(n: number, indices: Iterable<number>): boolean[] {
  const s = digitsStr(n);
  const m = Array.from(s, () => false);
  for (const i of indices) {
    if (i >= 0 && i < m.length) m[i] = true;
  }
  return m;
}

export function maskWhere(
  n: number,
  pred: (d: number, i: number, s: string) => boolean,
): boolean[] {
  const s = digitsStr(n);
  return Array.from(s, (ch, i) => pred(Number(ch), i, s));
}

export function maskDigit(n: number, digit: number): boolean[] {
  return maskWhere(n, (d) => d === digit);
}

export function maskSubstring(n: number, sub: string): boolean[] {
  const s = digitsStr(n);
  const m = Array.from(s, () => false);
  let from = 0;
  while (from <= s.length - sub.length) {
    const idx = s.indexOf(sub, from);
    if (idx < 0) break;
    for (let i = 0; i < sub.length; i++) m[idx + i] = true;
    from = idx + 1;
  }
  return m;
}

/** OR of several substring masks (first match wins per digit). */
export function maskAnySubstring(
  n: number,
  subs: readonly string[],
): boolean[] {
  const masks = subs.map((sub) => maskSubstring(n, sub));
  if (masks.length === 0) return maskNone(n);
  return masks[0]!.map((_, i) => masks.some((m) => m[i]!));
}

export function maskBookends(n: number): boolean[] {
  const s = digitsStr(n);
  if (s.length < 2) return maskAll(n);
  return maskIndices(n, [0, s.length - 1]);
}

export function maskLongestRun(n: number): boolean[] {
  const s = digitsStr(n);
  let bestStart = 0;
  let bestLen = 1;
  let curStart = 0;
  let curLen = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) {
      curLen += 1;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = i;
      curLen = 1;
    }
  }
  const idxs: number[] = [];
  for (let i = bestStart; i < bestStart + bestLen; i++) idxs.push(i);
  return maskIndices(n, idxs);
}

/** First run of `len` consecutive ascending or descending digits. */
export function maskConsecutiveSequence(n: number, len: number): boolean[] {
  const s = digitsStr(n);
  const d = s.split('').map(Number);
  for (let i = 0; i <= d.length - len; i++) {
    let asc = true;
    let desc = true;
    for (let j = 1; j < len; j++) {
      if (d[i + j] !== d[i]! + j) asc = false;
      if (d[i + j] !== d[i]! - j) desc = false;
    }
    if (asc || desc) {
      const idxs: number[] = [];
      for (let j = 0; j < len; j++) idxs.push(i + j);
      return maskIndices(n, idxs);
    }
  }
  return maskNone(n);
}

export function maskPairedDigits(n: number): boolean[] {
  const s = digitsStr(n);
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return Array.from(s, (ch) => (counts.get(ch) ?? 0) >= 2);
}

export function hasConsecutiveSequence(n: number, len: number): boolean {
  return maskConsecutiveSequence(n, len).some(Boolean);
}

export function uniqueDigitCount(n: number): number {
  return new Set(digitsStr(n)).size;
}
