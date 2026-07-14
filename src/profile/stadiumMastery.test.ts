import { describe, expect, it } from 'vitest';
import type { CompletedRun } from './types';
import {
  STADIUM_COSMETICS,
  STADIUM_MASTERY_CHALLENGES,
  challengesForStadium,
  createEmptyStadiumMastery,
  stadiumCosmetic,
  updateStadiumMastery,
} from './stadiumMastery';

function run(patch: Partial<CompletedRun> = {}): CompletedRun {
  return {
    id: 'stadium-run',
    completedAt: '2026-07-14T12:00:00.000Z',
    buildVersion: '0.10.0-alpha.1',
    characterId: 'maestro',
    outcome: 'defeat',
    score: 1_000,
    kills: 0,
    goals: 0,
    timeSeconds: 120,
    level: 3,
    upgradeIds: [],
    evolutionIds: [],
    ...patch,
  };
}

describe('stadium mastery', () => {
  it('authors four cosmetic-only challenges for every stadium', () => {
    expect(STADIUM_MASTERY_CHALLENGES).toHaveLength(20);
    expect(Object.keys(STADIUM_COSMETICS)).toHaveLength(20);
    for (const definition of STADIUM_MASTERY_CHALLENGES) {
      const cosmetic = stadiumCosmetic(definition.cosmeticId);
      expect(cosmetic).toMatchObject({ stadiumId: definition.stadiumId });
      expect(cosmetic).not.toHaveProperty('modifierBonus');
    }
  });

  it('does not award progress when a legacy run has no stadium identity', () => {
    const before = createEmptyStadiumMastery();
    const update = updateStadiumMastery(before, run({ kills: 999, goals: 99 }));
    expect(update.completedChallengeIds).toEqual([]);
    expect(update.unlockedCosmeticIds).toEqual([]);
    expect(update.progress).toEqual(before);
    expect(update.progress).not.toBe(before);
  });

  it('tracks cumulative stadium metrics and unlocks each reward once', () => {
    let progress = createEmptyStadiumMastery();
    const first = updateStadiumMastery(
      progress,
      run({ stadiumId: 'blood-court', outcome: 'victory', goals: 4, kills: 100, score: 8_000 }),
    );
    progress = first.progress;
    expect(first.completedChallengeIds).toEqual(['blood-court-debut']);
    expect(first.unlockedCosmeticIds).toEqual(['blood-court-title']);

    progress = updateStadiumMastery(
      progress,
      run({ stadiumId: 'blood-court', outcome: 'victory', goals: 3, kills: 75, score: 6_000 }),
    ).progress;
    const third = updateStadiumMastery(
      progress,
      run({ stadiumId: 'blood-court', outcome: 'victory', goals: 3, kills: 75, score: 9_000 }),
    );

    expect(third.progress['blood-court']).toMatchObject({
      matches: 3,
      wins: 3,
      goals: 10,
      kills: 250,
      bestScore: 9_000,
    });
    expect(third.completedChallengeIds).toEqual([
      'blood-court-victor',
      'blood-court-scorer',
      'blood-court-hunter',
    ]);
    expect(third.unlockedCosmeticIds).toEqual([
      'blood-court-banner',
      'blood-court-goalEffect',
      'blood-court-trail',
    ]);
    expect(third.progress['moonlit-classic'].matches).toBe(0);
    expect(challengesForStadium('blood-court')).toHaveLength(4);
  });
});
