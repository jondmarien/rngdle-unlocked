import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Dev/preview Neon HTTP round-trip counter for the Ranked gameplay path.
 * Each awaited neon-http statement ≈ one RTT; attach via drizzle logger in createDb.
 */

type NeonRttStore = {
  count: number;
  labels: string[];
};

const als = new AsyncLocalStorage<NeonRttStore>();

/** Enable when developing locally, on Vercel preview, or NEON_RTT_COUNT=1. */
export function isNeonRttCountEnabled(): boolean {
  return (
    process.env.NEON_RTT_COUNT === '1' ||
    process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview'
  );
}

/** Increment when a Neon HTTP statement is issued inside runWithNeonRttCount. */
export function noteNeonRoundTrip(label?: string): void {
  const store = als.getStore();
  if (!store) return;
  store.count += 1;
  if (label) store.labels.push(label);
}

export function getNeonRttSnapshot(): {
  count: number;
  labels: string[];
} | null {
  const store = als.getStore();
  if (!store) return null;
  return { count: store.count, labels: [...store.labels] };
}

/**
 * Run `fn` with a statement/RTT counter. When disabled, runs `fn` unchanged.
 */
export async function runWithNeonRttCount<T>(
  fn: () => Promise<T>,
  opts?: { enabled?: boolean },
): Promise<{ result: T; count: number; labels: string[] }> {
  const enabled = opts?.enabled ?? isNeonRttCountEnabled();
  if (!enabled) {
    const result = await fn();
    return { result, count: 0, labels: [] };
  }
  const store: NeonRttStore = { count: 0, labels: [] };
  const result = await als.run(store, fn);
  return { result, count: store.count, labels: [...store.labels] };
}
