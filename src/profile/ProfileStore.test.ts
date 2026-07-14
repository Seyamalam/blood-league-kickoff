import { describe, expect, it, vi } from 'vitest';
import { ProfileStore, createDefaultProfile } from './ProfileStore';
import type { CompletedRun, StorageLike } from './types';

function run(id: string, patch: Partial<CompletedRun> = {}): CompletedRun {
  return {
    id,
    completedAt: `2026-07-14T10:${id.padStart(2, '0')}:00.000Z`,
    buildVersion: '0.9.0-alpha.1',
    characterId: 'maestro',
    outcome: 'defeat',
    score: 1_000,
    kills: 10,
    goals: 0,
    timeSeconds: 120,
    level: 3,
    upgradeIds: ['silverBall'],
    evolutionIds: [],
    ...patch,
  };
}

function memoryStorage(initial?: string): { storage: StorageLike; values: Map<string, string> } {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('profile', initial);
  return {
    values,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
}

describe('ProfileStore', () => {
  it('creates, persists, and restores a version-one profile', () => {
    const { storage, values } = memoryStorage();
    const store = new ProfileStore('profile', storage, () => '2026-07-14T10:00:00.000Z');
    expect(store.value.unlockedCharacterIds).toEqual(['maestro']);
    store.recordRun(run('1'));
    const document = JSON.parse(values.get('profile') ?? '{}');
    expect(document.version).toBe(1);
    expect(new ProfileStore('profile', storage).value.lifetime.matchesPlayed).toBe(1);
  });

  it('settles a run once, updates stats/mastery/challenges, and unlocks exact levels', () => {
    const { storage } = memoryStorage();
    const store = new ProfileStore('profile', storage);
    const completed = run('1', {
      outcome: 'victory',
      score: 10_000,
      kills: 30,
      goals: 2,
      characterId: 'maestro',
    });
    const first = store.recordRun(completed);
    const duplicate = store.recordRun(completed);

    expect(first.applied).toBe(true);
    expect(first.accountXpEarned).toBe(445);
    expect(first.accountLevel).toBe(2);
    expect(first.newlyUnlockedCharacterIds).toEqual(['breakaway']);
    expect(first.completedChallengeIds).toEqual(expect.arrayContaining(['firstMatch', 'firstVictory']));
    expect(first.newlyUnlockedMasteryRewardIds).toEqual(['maestro-mastery-2']);
    expect(duplicate.applied).toBe(false);
    expect(store.value.lifetime.matchesPlayed).toBe(1);
    expect(store.value.characterMastery.maestro).toMatchObject({ matches: 1, wins: 1, xp: 445 });
  });

  it('round-trips optional deterministic replay metadata without changing the schema version', () => {
    const { storage, values } = memoryStorage();
    const store = new ProfileStore('profile', storage);
    store.recordRun(
      run('seeded', {
        seed: 0xf00dcafe,
        seedCode: '1UK2WDA',
        runMode: 'daily',
        challengeKey: 'daily:2026-07-14',
        rulesetVersion: 'alpha.7',
        difficultyId: 'champion',
        challengeModifierIds: ['noHealing', 'eliteLeague'],
        rewardMultiplier: 1.75,
      }),
    );
    const document = JSON.parse(values.get('profile') ?? '{}');
    expect(document.version).toBe(1);
    expect(new ProfileStore('profile', storage).value.recentRuns[0]).toMatchObject({
      seed: 0xf00dcafe,
      runMode: 'daily',
      challengeKey: 'daily:2026-07-14',
      rulesetVersion: 'alpha.7',
      difficultyId: 'champion',
      challengeModifierIds: ['noHealing', 'eliteLeague'],
      rewardMultiplier: 1.75,
    });
  });

  it('caps visible history at twenty while retaining duplicate guards', () => {
    const store = new ProfileStore('profile', memoryStorage().storage);
    for (let index = 0; index < 25; index += 1) store.recordRun(run(String(index)));
    expect(store.value.recentRuns).toHaveLength(20);
    expect(store.value.recentRuns[0]?.id).toBe('24');
    expect(store.recordRun(run('0')).applied).toBe(false);
    expect(store.value.lifetime.matchesPlayed).toBe(25);
  });

  it('allows only unlocked character selection and emits immutable snapshots', () => {
    const store = new ProfileStore('profile', memoryStorage().storage);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.selectCharacter('tower')).toBe(false);
    store.recordRun(run('1', { outcome: 'victory', score: 10_000, kills: 30, goals: 2 }));
    expect(store.selectCharacter('breakaway')).toBe(true);
    const snapshot = store.value;
    snapshot.unlockedCharacterIds.push('guardian');
    expect(store.value.unlockedCharacterIds).not.toContain('guardian');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('falls back safely for malformed and unknown-version documents', () => {
    const malformed = new ProfileStore('profile', memoryStorage('{broken').storage).value;
    const future = new ProfileStore(
      'profile',
      memoryStorage(JSON.stringify({ version: 99, profile: { accountXp: 999_999 } })).storage,
    ).value;
    expect(malformed).toMatchObject({ accountXp: 0, selectedCharacterId: 'maestro' });
    expect(future).toMatchObject({ accountXp: 0, selectedCharacterId: 'maestro' });
  });

  it('continues in memory when storage throws and resets explicitly', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const store = new ProfileStore('profile', storage);
    expect(store.recordRun(run('1')).applied).toBe(true);
    expect(store.value.lifetime.matchesPlayed).toBe(1);
    expect(store.reset()).toMatchObject(createDefaultProfile(store.value.updatedAt));
    expect(store.value.lifetime.matchesPlayed).toBe(0);
  });

  it('sanitizes partial stored profiles and rejects invalid run identities', () => {
    const document = JSON.stringify({
      version: 1,
      profile: {
        accountXp: 425,
        selectedCharacterId: 'guardian',
        unlockedCharacterIds: ['guardian', '<script>'],
        lifetime: { matchesPlayed: -5 },
      },
    });
    const store = new ProfileStore('profile', memoryStorage(document).storage);
    expect(store.value.unlockedCharacterIds).toEqual(['maestro', 'breakaway', 'guardian']);
    expect(store.value.selectedCharacterId).toBe('guardian');
    expect(store.value.lifetime.matchesPlayed).toBe(0);
    expect(store.recordRun({ ...run(''), id: '' }).applied).toBe(false);
  });
});
