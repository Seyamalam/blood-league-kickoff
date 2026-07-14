import { describe, expect, it } from 'vitest';
import {
  CURSE_DEFINITIONS,
  CURSE_IDS,
  calculateCurseDirectorModifiers,
  createProgressionState,
  setActiveCurses,
} from './index';

describe('run curses', () => {
  it('defines six frozen contracts with explicit benefits and drawbacks', () => {
    expect(Object.keys(CURSE_DEFINITIONS)).toEqual([...CURSE_IDS]);
    for (const curseId of CURSE_IDS) {
      const curse = CURSE_DEFINITIONS[curseId];
      expect(curse.id).toBe(curseId);
      expect(curse.benefit.length).toBeGreaterThan(10);
      expect(curse.drawback.length).toBeGreaterThan(10);
      expect(Object.keys(curse.benefitModifiers).length).toBeGreaterThan(0);
      expect(
        Object.keys(curse.drawbackModifiers).length + Object.keys(curse.directorModifiers).length,
      ).toBeGreaterThan(0);
      expect(Object.isFrozen(curse)).toBe(true);
      expect(Object.isFrozen(curse.benefitModifiers)).toBe(true);
    }
  });

  it('applies benefits and drawbacks without mutating the original run', () => {
    const initial = createProgressionState();
    const cursed = setActiveCurses(initial, ['bloodMoonPact', 'glassGoal']);

    expect(initial.activeCurses).toEqual([]);
    expect(initial.modifiers.allDamageMultiplier).toBe(1);
    expect(cursed.activeCurses).toEqual(['bloodMoonPact', 'glassGoal']);
    expect(cursed.modifiers.allDamageMultiplier).toBeCloseTo(1.4);
    expect(cursed.modifiers.ballDamageMultiplier).toBeCloseTo(1.7);
    expect(cursed.modifiers.kickPowerMultiplier).toBeCloseTo(1.25);
    expect(cursed.modifiers.damageTakenMultiplier).toBeCloseTo(1.45);
    expect(cursed.modifiers.maxHealthBonus).toBe(-35);
  });

  it('deduplicates contracts, enforces the three-curse cap, and stays bounded', () => {
    const cursed = setActiveCurses(createProgressionState(), [
      'suddenDeath',
      'suddenDeath',
      'bloodMoonPact',
      'glassGoal',
      'hungryPitch',
    ]);

    expect(cursed.activeCurses).toEqual(['suddenDeath', 'bloodMoonPact', 'glassGoal']);
    expect(cursed.modifiers.damageTakenMultiplier).toBeCloseTo(1.95);
    expect(cursed.modifiers.maxHealthBonus).toBe(-35);
  });

  it('preserves curse modifiers while choosing upgrades', () => {
    const initial = createProgressionState(null, {}, ['offsideTrap']);
    const leveled = { ...initial, pendingLevelUps: 1 };
    const result = setActiveCurses(leveled, ['offsideTrap']);

    expect(result.modifiers.dashCooldownMultiplier).toBeCloseTo(0.7);
    expect(result.modifiers.secondaryDamageMultiplier).toBeCloseTo(1.35);
    expect(result.modifiers.recallCooldownMultiplier).toBeCloseTo(1.25);
  });

  it('combines encounter pressure and a bounded risk reward', () => {
    const modifiers = calculateCurseDirectorModifiers(['bloodMoonPact', 'suddenDeath', 'cursedCrowd']);
    expect(modifiers.enemyHealthMultiplier).toBeCloseTo(1.2);
    expect(modifiers.bossHealthMultiplier).toBeCloseTo(1.35);
    expect(modifiers.eliteChanceBonus).toBeCloseTo(0.12);
    expect(modifiers.rewardMultiplier).toBeCloseTo(1.18 * 1.25 * 1.2);
  });
});
