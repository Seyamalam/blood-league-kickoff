import { describe, expect, it } from 'vitest';
import { UPGRADE_IDS } from '../game/progression';
import { createDefaultProfile } from './ProfileStore';
import {
  CURSE_UNLOCK_LEVELS,
  UPGRADE_UNLOCK_LEVELS,
  contentUnlockSummary,
  unlockedCurseIdsForLevel,
  unlockedStartingBonus,
  unlockedUpgradeIdsForLevel,
} from './contentUnlocks';
import { totalMasteryXpForLevel } from './mastery';

describe('content unlocks', () => {
  it('has a finite unlock level for every upgrade and curse', () => {
    expect(Object.keys(UPGRADE_UNLOCK_LEVELS)).toHaveLength(UPGRADE_IDS.length);
    expect(Object.values(UPGRADE_UNLOCK_LEVELS).every(Number.isFinite)).toBe(true);
    expect(Object.keys(CURSE_UNLOCK_LEVELS)).toHaveLength(6);
  });

  it('grows the available pools with account level', () => {
    expect(unlockedUpgradeIdsForLevel(1)).toEqual(
      expect.arrayContaining(['silverBall', 'powerKick', 'rapidRecall']),
    );
    expect(unlockedUpgradeIdsForLevel(99)).toHaveLength(UPGRADE_IDS.length);
    expect(unlockedCurseIdsForLevel(1)).toEqual([]);
    expect(unlockedCurseIdsForLevel(7)).toHaveLength(6);
  });

  it('exposes mastery affinity bonuses at level five', () => {
    const profile = createDefaultProfile();
    expect(unlockedStartingBonus(profile, 'maestro')).toBeNull();
    profile.characterMastery.maestro.xp = totalMasteryXpForLevel(5);
    expect(unlockedStartingBonus(profile, 'maestro')).toBe('rapidRecall');
    expect(contentUnlockSummary(profile).startingBonusUpgradeIds.maestro).toBe('rapidRecall');
  });
});
