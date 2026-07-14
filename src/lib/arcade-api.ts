import { createLogger, withTimeout } from './logger';
import {
  arcadeLeaderboardResponseSchema,
  arcadeMetaSchema,
  arcadeRollSchema,
  arcadeRunSchema,
} from './schemas';
import type { z } from 'zod';

const log = createLogger('arcade-api');
const FETCH_MS = 20_000;

export type ArcadeRun = z.infer<typeof arcadeRunSchema>;
export type ArcadeMeta = z.infer<typeof arcadeMetaSchema>;
export type ArcadeRoll = z.infer<typeof arcadeRollSchema>;
export type ArcadeLeaderboardEntry = z.infer<
  typeof arcadeLeaderboardResponseSchema
>['entries'][number];

async function parseJson(res: Response): Promise<unknown> {
  return res.json();
}

function errorMessage(raw: unknown, fallback: string): string {
  if (raw && typeof raw === 'object' && 'error' in raw) {
    return String((raw as { error?: string }).error ?? fallback);
  }
  return fallback;
}

export async function fetchArcadeState(signal?: AbortSignal): Promise<{
  meta: ArcadeMeta;
  activeRun: ArcadeRun | null;
  usernameRequired: boolean;
}> {
  const res = await withTimeout(
    fetch('/api/arcade', { credentials: 'include', signal }),
    FETCH_MS,
    'arcade state',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Failed to load Arcade'));
  const data = raw as {
    meta?: unknown;
    activeRun?: unknown;
    usernameRequired?: boolean;
  };
  const meta = arcadeMetaSchema.parse(data.meta);
  const activeRun =
    data.activeRun == null ? null : arcadeRunSchema.parse(data.activeRun);
  return {
    meta,
    activeRun,
    usernameRequired: Boolean(data.usernameRequired),
  };
}

export async function startArcadeRun(): Promise<{
  run: ArcadeRun;
  meta: ArcadeMeta;
}> {
  log.info('start');
  const res = await withTimeout(
    fetch('/api/arcade/start', {
      method: 'POST',
      credentials: 'include',
    }),
    FETCH_MS,
    'arcade start',
  );
  const raw = await parseJson(res);
  if (!res.ok) {
    const err = new Error(errorMessage(raw, 'Could not start run')) as Error & {
      code?: string;
      run?: ArcadeRun;
    };
    if (raw && typeof raw === 'object' && 'code' in raw) {
      err.code = String((raw as { code?: string }).code);
    }
    if (raw && typeof raw === 'object' && 'run' in raw) {
      try {
        err.run = arcadeRunSchema.parse((raw as { run: unknown }).run);
      } catch {
        /* ignore */
      }
    }
    throw err;
  }
  const data = raw as { run: unknown; meta: unknown };
  return {
    run: arcadeRunSchema.parse(data.run),
    meta: arcadeMetaSchema.parse(data.meta),
  };
}

export const ARCADE_ROLL_COUNTS = [1, 2, 5, 10, 15] as const;
export type ArcadeRollCount = (typeof ARCADE_ROLL_COUNTS)[number];

export async function arcadeRoll(opts?: {
  useReroll?: boolean;
  count?: ArcadeRollCount;
}): Promise<{
  run: ArcadeRun;
  meta: ArcadeMeta;
  roll: ArcadeRoll;
  rolls: ArcadeRoll[];
  busted: boolean;
  donResult?: 'win' | 'lose';
}> {
  const count = opts?.count ?? 1;
  const res = await withTimeout(
    fetch('/api/arcade/roll', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        useReroll: Boolean(opts?.useReroll),
        count,
      }),
    }),
    FETCH_MS,
    'arcade roll',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Arcade roll failed'));
  const data = raw as {
    run: unknown;
    meta: unknown;
    roll: unknown;
    rolls?: unknown;
    busted?: boolean;
    donResult?: 'win' | 'lose';
  };
  const roll = arcadeRollSchema.parse(data.roll);
  const rolls = Array.isArray(data.rolls)
    ? data.rolls.map((r) => arcadeRollSchema.parse(r))
    : [roll];
  return {
    run: arcadeRunSchema.parse(data.run),
    meta: arcadeMetaSchema.parse(data.meta),
    roll,
    rolls,
    busted: Boolean(data.busted),
    donResult: data.donResult,
  };
}

export async function buyArcadeUpgrade(upgradeId: string): Promise<{
  run: ArcadeRun;
}> {
  const res = await withTimeout(
    fetch('/api/arcade/buy', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgradeId }),
    }),
    FETCH_MS,
    'arcade buy',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Purchase failed'));
  return { run: arcadeRunSchema.parse((raw as { run: unknown }).run) };
}

export async function armArcadeActive(upgradeId: string): Promise<{
  run: ArcadeRun;
}> {
  const res = await withTimeout(
    fetch('/api/arcade/arm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgradeId }),
    }),
    FETCH_MS,
    'arcade arm',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Could not arm upgrade'));
  return { run: arcadeRunSchema.parse((raw as { run: unknown }).run) };
}

export async function cashOutArcadeRun(): Promise<{
  run: ArcadeRun;
  meta: ArcadeMeta;
}> {
  const res = await withTimeout(
    fetch('/api/arcade/cash-out', {
      method: 'POST',
      credentials: 'include',
    }),
    FETCH_MS,
    'arcade cash-out',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Cash out failed'));
  const data = raw as { run: unknown; meta: unknown };
  return {
    run: arcadeRunSchema.parse(data.run),
    meta: arcadeMetaSchema.parse(data.meta),
  };
}

export async function abandonArcadeRun(): Promise<{
  run: ArcadeRun;
  meta: ArcadeMeta;
}> {
  const res = await withTimeout(
    fetch('/api/arcade/abandon', {
      method: 'POST',
      credentials: 'include',
    }),
    FETCH_MS,
    'arcade abandon',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Abandon failed'));
  const data = raw as { run: unknown; meta: unknown };
  return {
    run: arcadeRunSchema.parse(data.run),
    meta: arcadeMetaSchema.parse(data.meta),
  };
}

export async function fetchArcadeLeaderboard(opts?: {
  limit?: number;
  signal?: AbortSignal;
}): Promise<{
  entries: ArcadeLeaderboardEntry[];
  me: ArcadeLeaderboardEntry | null;
}> {
  const q = new URLSearchParams({
    limit: String(opts?.limit ?? 50),
  });
  const res = await withTimeout(
    fetch(`/api/arcade/leaderboard?${q}`, {
      credentials: 'include',
      signal: opts?.signal,
    }),
    FETCH_MS,
    'arcade leaderboard',
  );
  const raw = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(raw, 'Failed to load'));
  const parsed = arcadeLeaderboardResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid arcade leaderboard response');
  return {
    entries: parsed.data.entries,
    me: parsed.data.me ?? null,
  };
}
