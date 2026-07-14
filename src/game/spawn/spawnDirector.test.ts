import { describe, expect, it } from 'vitest';
import { FULL_MATCH_SPAWN_CONFIG, resolveSpawnProfile, selectSpawnArchetype } from './index';

describe('spawn director', () => {
  it('ramps authored combat-stage pressure without exceeding the final budget', () => {
    const start = resolveSpawnProfile({ stage: 'firstHalf', stageElapsed: 0, matchElapsed: 30 });
    const middle = resolveSpawnProfile({ stage: 'firstHalf', stageElapsed: 67.5, matchElapsed: 97.5 });
    const end = resolveSpawnProfile({ stage: 'firstHalf', stageElapsed: 999, matchElapsed: 165 });

    expect(start).toMatchObject({ enabled: true, populationCap: 22, spawnInterval: 0.7 });
    expect(middle.populationCap).toBe(39);
    expect(middle.spawnInterval).toBeCloseTo(0.49);
    expect(end).toMatchObject({ enabled: true, populationCap: 56, spawnInterval: 0.28 });
  });

  it.each(['goalOpportunity', 'halftimeChoice', 'finalGoal', 'victory', 'dead'] as const)(
    'disables ordinary spawning during %s',
    (stage) => {
      expect(resolveSpawnProfile({ stage, stageElapsed: 10, matchElapsed: 200 })).toEqual({
        enabled: false,
        matchElapsed: 0,
        populationCap: 0,
        spawnInterval: Number.POSITIVE_INFINITY,
        roster: [],
      });
    },
  );

  it('selects weighted roster entries deterministically at exact boundaries', () => {
    const profile = resolveSpawnProfile({ stage: 'opening', stageElapsed: 10, matchElapsed: 10 });
    expect(selectSpawnArchetype(profile, () => 0)).toBe('bloodFan');
    expect(selectSpawnArchetype(profile, () => 0.7799)).toBe('bloodFan');
    expect(selectSpawnArchetype(profile, () => 0.78)).toBe('winger');
    expect(selectSpawnArchetype(profile, () => 1)).toBe('winger');
  });

  it('introduces the expanded special roster progressively', () => {
    const early = resolveSpawnProfile({ stage: 'firstHalf', stageElapsed: 35, matchElapsed: 65 });
    const advanced = resolveSpawnProfile({ stage: 'escalation', stageElapsed: 20, matchElapsed: 185 });
    const earlyNames = early.roster
      .filter((entry) => (entry.unlockMatchTime ?? 0) <= early.matchElapsed)
      .map((entry) => entry.archetype);
    const advancedNames = advanced.roster
      .filter((entry) => (entry.unlockMatchTime ?? 0) <= advanced.matchElapsed)
      .map((entry) => entry.archetype);

    expect(earlyNames).not.toContain('bloodArcher');
    expect(advancedNames).toEqual(expect.arrayContaining(['bloodArcher', 'shadowRunner', 'corpseBomber']));
  });

  it('sanitizes invalid elapsed time and ignores invalid weights', () => {
    const base = FULL_MATCH_SPAWN_CONFIG.opening;
    if (!base.enabled) throw new Error('Opening spawn stage must be enabled.');
    const profile = resolveSpawnProfile(
      { stage: 'opening', stageElapsed: Number.NaN, matchElapsed: Number.POSITIVE_INFINITY },
      {
        ...FULL_MATCH_SPAWN_CONFIG,
        opening: { ...base, roster: [{ archetype: 'bloodFan', weight: Number.NaN }] },
      },
    );
    expect(profile.populationCap).toBe(base.populationCapStart);
    expect(profile.spawnInterval).toBe(base.spawnIntervalStart);
    expect(selectSpawnArchetype(profile, () => Number.NaN)).toBeNull();
  });
});
