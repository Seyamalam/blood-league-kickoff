import { describe, expect, it } from 'vitest';
import { accountLevelForXp, totalAccountXpForLevel, updatePersonalBests } from './profileProgression';
import { unlockedCharactersForLevel } from './unlocks';
import type { CompletedRun, PersonalBests } from './types';

const BESTS: PersonalBests = {
  score: 100,
  kills: 5,
  goals: 1,
  highestLevel: 2,
  longestSurvivalSeconds: 60,
  fastestVictorySeconds: null,
};

const RUN: CompletedRun = {
  id: 'run',
  completedAt: '2026-07-14T10:00:00.000Z',
  buildVersion: 'test',
  characterId: 'maestro',
  outcome: 'defeat',
  score: 200,
  kills: 10,
  goals: 0,
  timeSeconds: 90,
  level: 4,
  upgradeIds: [],
  evolutionIds: [],
};

describe('account progression', () => {
  it('uses exact cumulative account-level boundaries', () => {
    expect(totalAccountXpForLevel(1)).toBe(0);
    expect(totalAccountXpForLevel(2)).toBe(425);
    expect(totalAccountXpForLevel(3)).toBe(1_000);
    expect(accountLevelForXp(424)).toBe(1);
    expect(accountLevelForXp(425)).toBe(2);
    expect(accountLevelForXp(1_000)).toBe(3);
  });

  it('unlocks the six characters one per account level', () => {
    expect(unlockedCharactersForLevel(1)).toEqual(['maestro']);
    expect(unlockedCharactersForLevel(3)).toEqual(['maestro', 'breakaway', 'tower']);
    expect(unlockedCharactersForLevel(99)).toHaveLength(6);
  });

  it('tracks fastest victory only from victories while retaining other bests', () => {
    const defeat = updatePersonalBests(BESTS, RUN);
    expect(defeat.fastestVictorySeconds).toBeNull();
    const victory = updatePersonalBests(defeat, { ...RUN, outcome: 'victory', timeSeconds: 80 });
    const slowerVictory = updatePersonalBests(victory, {
      ...RUN,
      outcome: 'victory',
      timeSeconds: 100,
    });
    expect(slowerVictory.fastestVictorySeconds).toBe(80);
    expect(slowerVictory.score).toBe(200);
    expect(slowerVictory.highestLevel).toBe(4);
  });
});
