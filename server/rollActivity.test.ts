import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { asCrownPeriod } from './rollActivity.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'rollActivity.ts'), 'utf8');

describe('asCrownPeriod', () => {
  it('narrows known period literals', () => {
    expect(asCrownPeriod('today')).toBe('today');
    expect(asCrownPeriod('week')).toBe('week');
    expect(asCrownPeriod('alltime')).toBe('alltime');
  });

  it('rejects unknown values', () => {
    expect(asCrownPeriod('day')).toBeNull();
    expect(asCrownPeriod(null)).toBeNull();
    expect(asCrownPeriod(1)).toBeNull();
  });
});

describe('rollActivity crown query shape (source)', () => {
  it('uses UNION ALL of three period tops with typed period literals', () => {
    expect(src).toContain('unionAll');
    expect(src).toContain('fetchCrownTopsUnion');
    expect(src).toContain('crownPeriodLiteral');
    expect(src).toContain("sql<'today' | 'week' | 'alltime'>");
    expect(src).toContain('asCrownPeriod');
    expect(src).toContain("crownTopArm(db, 'today'");
    expect(src).toContain("crownTopArm(db, 'week'");
    expect(src).toContain("crownTopArm(db, 'alltime'");
  });

  it('skips user re-fetch when username is passed through', () => {
    expect(src).toContain('username?: string | null');
    expect(src).toMatch(
      /if \(!handle\) \{[\s\S]*select\(\{ username: user\.username/,
    );
  });

  it('fetches previous #1 / writes notifs only via announceCrown (wins)', () => {
    expect(src).toContain('async function announceCrown');
    expect(src).toContain('compare-and-swap');
    // Reject advisory-lock hardening in favor of CAS (mentioned in comment).
    expect(src).toMatch(/not\*\* pg_advisory_lock|not.*pg_advisory_lock/i);
    // Discrete tryCrown per-period top SELECT removed.
    expect(src).not.toContain('async function tryCrown');
  });
});
