import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from './types';
import {
  MAX_MASTERY_LEVEL,
  allMasteryRewards,
  masteryLevelForXp,
  masteryModifierBonusFor,
  masteryRewardsFor,
  newlyUnlockedMasteryRewards,
  totalMasteryXpForLevel,
  unlockedMasteryRewards,
} from './mastery';

describe('character mastery', () => {
  it('uses exact cumulative XP boundaries and caps the level', () => {
    expect(totalMasteryXpForLevel(1)).toBe(0);
    expect(totalMasteryXpForLevel(2)).toBe(225);
    expect(totalMasteryXpForLevel(3)).toBe(540);
    expect(masteryLevelForXp(224)).toBe(1);
    expect(masteryLevelForXp(225)).toBe(2);
    expect(masteryLevelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_MASTERY_LEVEL);
  });

  it('provides five rewards and two distinct perks for every character', () => {
    expect(allMasteryRewards()).toHaveLength(CHARACTER_IDS.length * 5);
    for (const characterId of CHARACTER_IDS) {
      const rewards = masteryRewardsFor(characterId);
      expect(rewards.map((item) => item.level)).toEqual([2, 3, 5, 7, 10]);
      expect(rewards.filter((item) => item.kind === 'perk')).toHaveLength(2);
      expect(new Set(rewards.map((item) => item.id)).size).toBe(5);
    }
  });

  it('derives unlocks without adding profile migration state', () => {
    expect(unlockedMasteryRewards('maestro', 1)).toEqual([]);
    expect(unlockedMasteryRewards('maestro', 5).map((item) => item.level)).toEqual([2, 3, 5]);
    expect(newlyUnlockedMasteryRewards('maestro', 2, 7).map((item) => item.level)).toEqual([3, 5, 7]);
  });

  it('combines only perks earned at the supplied level', () => {
    expect(masteryModifierBonusFor('tower', 2)).toEqual({});
    expect(masteryModifierBonusFor('tower', Number.NaN)).toEqual({});
    expect(masteryModifierBonusFor('tower', 3)).toEqual({
      kickPowerMultiplier: 0.06,
      knockbackMultiplier: 0.04,
    });
    expect(masteryModifierBonusFor('tower', 7)).toMatchObject({ maxHealthBonus: 10 });
    expect(masteryModifierBonusFor('guardian', 7)).toMatchObject({
      damageTakenMultiplier: -0.06,
      pickupRadiusMultiplier: 0.08,
    });
  });
});
