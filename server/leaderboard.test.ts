import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import {
  allPublicRollFilters,
  parseScope,
  practiceRollFilters,
  rankedRollFilters,
} from './leaderboard.js';

const here = dirname(fileURLToPath(import.meta.url));
const leaderboardSrc = readFileSync(join(here, 'leaderboard.ts'), 'utf8');

describe('parseScope', () => {
  it('maps practice aliases', () => {
    expect(parseScope('practice')).toBe('practice');
    expect(parseScope('local')).toBe('practice');
  });

  it('maps alltime aliases', () => {
    expect(parseScope('alltime')).toBe('alltime');
    expect(parseScope('lifetime')).toBe('alltime');
  });

  it('defaults unknown / null to ranked', () => {
    expect(parseScope(null)).toBe('ranked');
    expect(parseScope('ranked')).toBe('ranked');
    expect(parseScope('nope')).toBe('ranked');
  });
});

describe('roll filter helpers', () => {
  it('builds SQL filter trees (smoke)', () => {
    expect(rankedRollFilters()).toBeTruthy();
    expect(practiceRollFilters()).toBeTruthy();
    expect(allPublicRollFilters()).toBeTruthy();
  });
});

describe('board pipeline contracts (source)', () => {
  it('Practice all-time aggregates rolls via practiceRollFilters, not userProgress', () => {
    const practiceFn = leaderboardSrc.slice(
      leaderboardSrc.indexOf('async function practiceBoard'),
      leaderboardSrc.indexOf('async function allTimeBoard'),
    );
    expect(practiceFn).toContain('practiceRollFilters()');
    expect(practiceFn).not.toContain('userProgress');
    expect(practiceFn).toContain('sum(${rolls.totalEp})');
  });

  it('All-Time board ranks user_progress lifetime totals and badges', () => {
    const allTimeFn = leaderboardSrc.slice(
      leaderboardSrc.indexOf('async function allTimeBoard'),
    );
    expect(allTimeFn).toContain('userProgress.lifetimeEp');
    expect(allTimeFn).toContain('userProgress.lifetimeRollCount');
    expect(allTimeFn).toContain("opts.sort === 'badges'");
    expect(allTimeFn).toContain("scope: 'alltime'");
  });

  it('All-Time Best Roll uses all public rolls', () => {
    expect(leaderboardSrc).toContain('allPublicRollFilters');
    expect(leaderboardSrc).toMatch(
      /scope === 'alltime'\) return allPublicRollFilters/,
    );
  });
});
