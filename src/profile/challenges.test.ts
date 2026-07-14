import { describe, expect, it } from 'vitest';
import { evaluateChallenges } from './challenges';
import { createDefaultProfile } from './ProfileStore';
import { updateLifetime, updatePersonalBests } from './profileProgression';
import type { CompletedRun } from './types';

const RUN: CompletedRun = {
  id: 'challenge-run',
  completedAt: '2026-07-14T11:00:00.000Z',
  buildVersion: 'test',
  characterId: 'maestro',
  outcome: 'victory',
  score: 12_000,
  kills: 30,
  goals: 1,
  timeSeconds: 301,
  level: 5,
  upgradeIds: [],
  evolutionIds: ['moonBreaker', 'stormHalo'],
};

describe('challenge evaluation', () => {
  it('completes eligible cumulative and run-best challenges once', () => {
    const profile = createDefaultProfile(RUN.completedAt);
    profile.lifetime = updateLifetime(profile.lifetime, RUN);
    profile.personalBests = updatePersonalBests(profile.personalBests, RUN);
    const first = evaluateChallenges(profile, RUN);
    expect(first.completed).toEqual(
      expect.arrayContaining([
        'firstMatch',
        'firstVictory',
        'scoreTenThousand',
        'killTwentyFive',
        'scoreFirstGoal',
        'surviveFiveMinutes',
        'reachRunLevelFive',
        'unlockTwoEvolutions',
      ]),
    );

    profile.challengeProgress = first.progress;
    const second = evaluateChallenges(profile, RUN);
    expect(second.completed).toEqual([]);
    expect(second.progress.firstVictory.completedAt).toBe(RUN.completedAt);
  });
});
