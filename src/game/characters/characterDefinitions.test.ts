import { describe, expect, it } from 'vitest';
import { calculateModifiers, createProgressionState } from '../progression';
import { CHARACTER_DEFINITIONS, CHARACTER_IDS } from './index';

describe('character definitions', () => {
  it('defines every original roster member with immutable presentation and modifiers', () => {
    expect(Object.keys(CHARACTER_DEFINITIONS)).toEqual([...CHARACTER_IDS]);

    for (const characterId of CHARACTER_IDS) {
      const definition = CHARACTER_DEFINITIONS[characterId];
      expect(definition.id).toBe(characterId);
      expect(definition.name).not.toMatch(/messi|mbapp|haaland/i);
      expect(definition.description.length).toBeGreaterThan(20);
      expect(definition.strength.length).toBeGreaterThan(5);
      expect(definition.weakness.length).toBeGreaterThan(5);
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.modifierBonus)).toBe(true);
      expect(Object.isFrozen(definition.visualStyle)).toBe(true);
    }
  });

  it('applies a selected character once while preserving neutral unselected runs', () => {
    const neutral = createProgressionState();
    const maestro = createProgressionState('maestro');
    const tower = createProgressionState('tower');

    expect(neutral.characterId).toBeNull();
    expect(neutral.modifiers.kickPowerMultiplier).toBe(1);
    expect(maestro.characterId).toBe('maestro');
    expect(maestro.modifiers.curveStrengthMultiplier).toBeCloseTo(1.2);
    expect(maestro.modifiers.kickPowerMultiplier).toBeCloseTo(0.9);
    expect(tower.modifiers.maxHealthBonus).toBe(25);
    expect(tower.modifiers.movementSpeedMultiplier).toBeCloseTo(0.9);

    expect(calculateModifiers(tower.upgradeStacks, tower.evolutions, tower.characterId)).toEqual(
      tower.modifiers,
    );
  });

  it('keeps each roster build inside safe runtime bounds', () => {
    for (const characterId of CHARACTER_IDS) {
      const { modifiers } = createProgressionState(characterId);
      expect(modifiers.maxHealthBonus).toBeGreaterThanOrEqual(-50);
      expect(modifiers.movementSpeedMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(modifiers.dashCooldownMultiplier).toBeGreaterThanOrEqual(0.4);
      expect(modifiers.damageTakenMultiplier).toBeGreaterThanOrEqual(0.25);
      expect(modifiers.allDamageMultiplier).toBeGreaterThanOrEqual(0.25);
      expect(modifiers.secondaryDamageMultiplier).toBeGreaterThanOrEqual(0.25);
    }
  });
});
