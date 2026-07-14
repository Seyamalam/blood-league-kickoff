import { describe, expect, it } from 'vitest';
import { LocalLeaderboardRepository } from '../leaderboard';
import { CHALLENGE_DEFINITIONS, createDefaultProfile, type RunRecord } from '../profile';
import { createCareerViewModel } from './CareerOverlay';

function run(id: string, patch: Partial<RunRecord> = {}): RunRecord {
  return {
    id,
    completedAt: `2026-07-14T10:${id}:00.000Z`,
    buildVersion: 'alpha.6',
    characterId: 'maestro',
    outcome: 'victory',
    score: 1_000,
    kills: 10,
    goals: 1,
    timeSeconds: 200,
    level: 4,
    upgradeIds: ['silverBall'],
    evolutionIds: [],
    accountXpEarned: 100,
    masteryXpEarned: 100,
    ...patch,
  };
}

describe('career overlay view model', () => {
  it('presents account progress, all characters, all challenges, and empty offline boards', () => {
    const profile = createDefaultProfile('2026-07-14T10:00:00.000Z');
    const view = createCareerViewModel(profile, 'alpha.6');

    expect(view).toMatchObject({ accountLevel: 1, accountXp: 0, levelXp: 0, levelXpTarget: 425 });
    expect(view.characters).toHaveLength(6);
    expect(view.characters[0]).toMatchObject({
      id: 'maestro',
      name: 'The Maestro',
      unlocked: true,
      selected: true,
      unlockLevel: 1,
    });
    expect(view.characters[1]).toMatchObject({ id: 'breakaway', unlocked: false, unlockLevel: 2 });
    expect(view.challenges).toHaveLength(Object.keys(CHALLENGE_DEFINITIONS).length);
    expect(view.stadiums).toHaveLength(5);
    expect(view.stadiums[0]).toMatchObject({ name: 'Blood Court', completed: 0, target: 4 });
    expect(view.recentRuns).toEqual([]);
    expect(view.scoreBoard).toEqual([]);
    expect(view.fastestVictoryBoard).toEqual([]);
  });

  it('includes mastery and completed challenge state', () => {
    const profile = createDefaultProfile();
    profile.accountXp = 425;
    profile.unlockedCharacterIds = ['maestro', 'breakaway'];
    profile.selectedCharacterId = 'breakaway';
    profile.characterMastery.breakaway = { xp: 500, matches: 4, wins: 2, bestScore: 12_000 };
    profile.challengeProgress.firstVictory = {
      value: 1,
      completedAt: '2026-07-14T10:00:00.000Z',
    };
    const view = createCareerViewModel(profile, 'alpha.6');

    expect(view.accountLevel).toBe(2);
    expect(view.characters.find((character) => character.id === 'breakaway')).toMatchObject({
      selected: true,
      masteryXp: 500,
      matches: 4,
      wins: 2,
      bestScore: 12_000,
      trait: 'Movement and frequent dashes',
      weakness: 'Lower maximum health',
    });
    expect(view.challenges.find((challenge) => challenge.id === 'firstVictory')).toMatchObject({
      completed: true,
      value: 1,
      target: 1,
    });
  });

  it('keeps local boards on the supplied build and applies category ordering', () => {
    const profile = createDefaultProfile();
    profile.recentRuns = [
      run('01', { score: 2_000, timeSeconds: 180 }),
      run('02', { score: 5_000, timeSeconds: 220, characterId: 'tower' }),
      run('03', { score: 9_000, timeSeconds: 100, buildVersion: 'alpha.5' }),
      run('04', { score: 8_000, timeSeconds: 90, outcome: 'defeat' }),
    ];
    const repository = new LocalLeaderboardRepository(profile);
    const view = createCareerViewModel(profile, 'alpha.6', repository);

    expect(view.recentRuns).toHaveLength(4);
    expect(view.scoreBoard.map((entry) => entry.id)).toEqual(['04', '02', '01']);
    expect(view.fastestVictoryBoard.map((entry) => entry.id)).toEqual(['01', '02']);
    const copiedLeader = view.scoreBoard[0];
    if (copiedLeader) (copiedLeader.upgradeIds as string[]).push('mutated');
    expect(profile.recentRuns[3]?.upgradeIds).not.toContain('mutated');
  });
});
