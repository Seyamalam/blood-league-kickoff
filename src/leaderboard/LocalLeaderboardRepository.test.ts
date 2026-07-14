import { describe, expect, it } from 'vitest';
import { createDefaultProfile, type RunRecord } from '../profile';
import { LocalLeaderboardRepository } from './LocalLeaderboardRepository';

function record(id: string, score: number, timeSeconds: number, patch: Partial<RunRecord> = {}): RunRecord {
  return {
    id,
    completedAt: `2026-07-14T10:${id}:00.000Z`,
    buildVersion: 'alpha.1',
    characterId: 'maestro',
    outcome: 'victory',
    score,
    kills: 0,
    goals: 0,
    timeSeconds,
    level: 1,
    upgradeIds: [],
    evolutionIds: [],
    accountXpEarned: 25,
    masteryXpEarned: 25,
    ...patch,
  };
}

describe('LocalLeaderboardRepository', () => {
  it('ranks score within exact version and optional character partitions', () => {
    const profile = createDefaultProfile();
    profile.recentRuns = [
      record('01', 100, 100),
      record('02', 300, 120),
      record('03', 999, 90, { buildVersion: 'alpha.2' }),
      record('04', 500, 80, { characterId: 'tower' }),
    ];
    const repository = new LocalLeaderboardRepository(profile);
    expect(
      repository.getEntries({ category: 'score', buildVersion: 'alpha.1' }).map((entry) => entry.run.id),
    ).toEqual(['04', '02', '01']);
    expect(
      repository
        .getEntries({ category: 'score', buildVersion: 'alpha.1', characterId: 'maestro' })
        .map((entry) => entry.run.id),
    ).toEqual(['02', '01']);
  });

  it('ranks only victories by fastest time with score as the tie-breaker', () => {
    const profile = createDefaultProfile();
    profile.recentRuns = [
      record('01', 100, 80),
      record('02', 300, 70),
      record('03', 500, 70),
      record('04', 9_999, 10, { outcome: 'defeat' }),
    ];
    const repository = new LocalLeaderboardRepository(() => profile);
    const entries = repository.getEntries({ category: 'fastestVictory', buildVersion: 'alpha.1', limit: 2 });
    expect(entries.map((entry) => entry.run.id)).toEqual(['03', '02']);
    expect(entries.map((entry) => entry.rank)).toEqual([1, 2]);
  });

  it('partitions seeded challenge boards by mode and challenge key', () => {
    const profile = createDefaultProfile();
    profile.recentRuns = [
      record('01', 100, 100, { runMode: 'daily', challengeKey: 'daily:2026-07-14' }),
      record('02', 500, 100, { runMode: 'daily', challengeKey: 'daily:2026-07-13' }),
      record('03', 900, 100, { runMode: 'weekly', challengeKey: 'weekly:2026-W29' }),
    ];
    const repository = new LocalLeaderboardRepository(profile);
    const entries = repository.getEntries({
      category: 'score',
      buildVersion: 'alpha.1',
      runMode: 'daily',
      challengeKey: 'daily:2026-07-14',
    });

    expect(entries.map((entry) => entry.run.id)).toEqual(['01']);
  });
});
