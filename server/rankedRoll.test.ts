import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

const here = dirname(fileURLToPath(import.meta.url));
const rankedSrc = readFileSync(join(here, 'rankedRoll.ts'), 'utf8');
const apiSrc = readFileSync(join(here, '../api/ranked-roll/index.ts'), 'utf8');

describe('rankedRoll persist + identity pass-through (source)', () => {
  it('persists via single CTE (rolls INSERT + user_progress UPSERT)', () => {
    expect(rankedSrc).toContain('WITH inserted AS');
    expect(rankedSrc).toContain('INSERT INTO rolls');
    expect(rankedSrc).toContain('INSERT INTO user_progress');
    expect(rankedSrc).toContain('ON CONFLICT (user_id) DO UPDATE');
    expect(rankedSrc).toContain('persistRankedRollAndProgress');
    // Happy path must not call db.batch / separate drizzle inserts.
    expect(rankedSrc).not.toMatch(/await db\.batch\b/);
    expect(rankedSrc).not.toMatch(/await db\.insert\(rolls\)/);
    expect(rankedSrc).not.toMatch(/\.insert\(userProgress\)/);
  });

  it('retries CTE without short_code on collision', () => {
    expect(rankedSrc).toContain('ranked insert retry without short_code');
    expect(rankedSrc).toContain('shortCode: null');
  });

  it('accepts username/name and forwards to processRollActivity', () => {
    expect(rankedSrc).toContain('username?: string | null');
    expect(rankedSrc).toContain('name?: string | null');
    expect(rankedSrc).toContain('username: opts.username');
    expect(rankedSrc).toContain('name: opts.name');
  });

  it('ranked-roll API loads identity once and passes it into issue', () => {
    expect(apiSrc).toContain('getPublicIdentity');
    expect(apiSrc).toContain('username: identity.username');
    expect(apiSrc).toContain('name: identity.name');
    expect(apiSrc).toContain('runWithNeonRttCount');
    expect(apiSrc).toContain('targetNoCrown');
  });
});
