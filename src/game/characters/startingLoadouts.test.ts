import { describe, expect, it } from 'vitest';
import { createProgressionState } from '../progression';
import { CHARACTER_IDS } from './types';
import { applyStartingLoadout, CHARACTER_STARTING_LOADOUTS, startingLoadoutFor } from './startingLoadouts';

describe('character starting loadouts', () => {
  it('defines a unique two-part loadout for every character', () => {
    const signatures = CHARACTER_IDS.map((id) => {
      const loadout = startingLoadoutFor(id);
      expect(loadout.characterId).toBe(id);
      expect(loadout.entries).toHaveLength(2);
      expect(loadout.entries.every((entry) => entry.stacks > 0)).toBe(true);
      return loadout.entries.map((entry) => `${entry.upgradeId}:${entry.stacks}`).join('|');
    });

    expect(new Set(signatures).size).toBe(CHARACTER_IDS.length);
  });

  it('grants the loadout without mutating the supplied stack record', () => {
    const initial = createProgressionState('breakaway').upgradeStacks;
    const result = applyStartingLoadout(initial, 'breakaway');

    expect(initial.powerKick).toBe(0);
    expect(initial.dashShockwave).toBe(0);
    expect(result.powerKick).toBe(1);
    expect(result.dashShockwave).toBe(1);
  });

  it('does not reduce an existing stack count when reapplying a loadout', () => {
    const initial = createProgressionState('tower').upgradeStacks;
    initial.powerKick = 4;

    const result = applyStartingLoadout(initial, 'tower');
    expect(result.powerKick).toBe(4);
    expect(result.ironHeart).toBe(1);
  });

  it('freezes definitions and nested entries', () => {
    expect(Object.isFrozen(CHARACTER_STARTING_LOADOUTS)).toBe(true);
    expect(Object.isFrozen(CHARACTER_STARTING_LOADOUTS.maestro)).toBe(true);
    expect(Object.isFrozen(CHARACTER_STARTING_LOADOUTS.maestro.entries)).toBe(true);
    expect(Object.isFrozen(CHARACTER_STARTING_LOADOUTS.maestro.entries[0])).toBe(true);
  });
});
