import { mapBytesToInclusiveRange, REJECT_THRESHOLD } from './rng';

export type ChallengeKind = 'daily' | 'weekly';

export type ChallengeInfo = {
  kind: ChallengeKind;
  /** Public shared seed material (period label). */
  periodKey: string;
  seed: string;
  label: string;
  endsAt: string;
};

/** UTC date key YYYY-MM-DD */
export function utcDateKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO week key YYYY-Www (UTC) */
export function utcWeekKey(d = new Date()): string {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // Thursday in current week decides the year
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function endOfUtcDay(d = new Date()): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0),
  );
}

function endOfUtcIsoWeek(d = new Date()): Date {
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  const daysUntilMon = 8 - day;
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + daysUntilMon,
      0,
      0,
      0,
    ),
  );
}

/** Deterministic material for period seeds (no user id). */
export function buildPeriodSeed(kind: ChallengeKind, at = new Date()): ChallengeInfo {
  if (kind === 'daily') {
    const periodKey = utcDateKey(at);
    return {
      kind: 'daily',
      periodKey,
      seed: `rngdle:daily:${periodKey}`,
      label: `Daily · ${periodKey} UTC`,
      endsAt: endOfUtcDay(at).toISOString(),
    };
  }
  const periodKey = utcWeekKey(at);
  return {
    kind: 'weekly',
    periodKey,
    seed: `rngdle:weekly:${periodKey}`,
    label: `Weekly · ${periodKey} UTC`,
    endsAt: endOfUtcIsoWeek(at).toISOString(),
  };
}

async function sha256Text(text: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    // Test fallback: simple hash of char codes into 32 bytes
    const out = new Uint8Array(32);
    for (let i = 0; i < text.length; i++) {
      out[i % 32] ^= text.charCodeAt(i);
      out[(i + 7) % 32] = (out[(i + 7) % 32]! + text.charCodeAt(i)) & 0xff;
    }
    return out;
  }
  const digest = await cryptoObj.subtle.digest('SHA-256', enc.encode(text));
  return new Uint8Array(digest);
}

/**
 * Personal challenge number: shared period seed + account id (or guest key).
 * Same inputs always yield the same 0..ROLL_MAX number.
 */
export async function challengeNumber(
  periodSeed: string,
  subjectId: string,
): Promise<number> {
  const material = `${periodSeed}|${subjectId}`;
  for (let attempt = 0; attempt < 64; attempt++) {
    const digest = await sha256Text(`${material}|${attempt}`);
    const n = mapBytesToInclusiveRange(digest);
    if (n !== null) return n;
  }
  // Extremely unlikely path if reject sampling never accepts
  void REJECT_THRESHOLD;
  const digest = await sha256Text(material);
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  return view.getUint32(0, false) % 1_000_001;
}
