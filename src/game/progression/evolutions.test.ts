import { describe, expect, it } from 'vitest';
import {
  EVOLUTION_DEFINITIONS,
  EVOLUTION_IDS,
  UPGRADE_DEFINITIONS,
  calculateModifiers,
  chooseUpgrade,
  createProgressionState,
  getEligibleEvolutionIds,
  grantBloodXp,
  totalXpRequiredForLevel,
  type EvolutionUnlockEvent,
  type ProgressionState,
  type UpgradeId,
} from './index';

describe('evolution definitions', () => {
  it('defines every evolution as a unique, reachable two-upgrade contract', () => {
    expect(Object.keys(EVOLUTION_DEFINITIONS)).toEqual([...EVOLUTION_IDS]);
    const signatures = new Set<string>();

    for (const evolutionId of EVOLUTION_IDS) {
      const definition = EVOLUTION_DEFINITIONS[evolutionId];
      expect(definition.id).toBe(evolutionId);
      expect(definition.requirements).toHaveLength(2);
      expect(new Set(definition.requirements.map(({ upgradeId }) => upgradeId)).size).toBe(2);
      for (const requirement of definition.requirements) {
        expect(requirement.minStacks).toBeGreaterThanOrEqual(1);
        expect(requirement.minStacks).toBeLessThanOrEqual(
          UPGRADE_DEFINITIONS[requirement.upgradeId].maxStacks,
        );
      }
      const signature = definition.requirements
        .map(({ upgradeId, minStacks }) => `${upgradeId}:${minStacks}`)
        .sort()
        .join('|');
      expect(signatures.has(signature)).toBe(false);
      signatures.add(signature);

      const bonuses = Object.values(definition.modifierBonus);
      expect(bonuses.length).toBeGreaterThan(0);
      expect(bonuses.every((bonus) => Number.isFinite(bonus) && bonus !== 0)).toBe(true);
    }
  });

  it.each(EVOLUTION_IDS)('%s becomes eligible only at every exact requirement boundary', (evolutionId) => {
    const definition = EVOLUTION_DEFINITIONS[evolutionId];
    for (let missingIndex = 0; missingIndex < definition.requirements.length; missingIndex += 1) {
      const state = createProgressionState();
      definition.requirements.forEach((requirement, index) => {
        state.upgradeStacks[requirement.upgradeId] = requirement.minStacks - (index === missingIndex ? 1 : 0);
      });
      expect(getEligibleEvolutionIds(state)).not.toContain(evolutionId);
      const missing = definition.requirements[missingIndex]!;
      state.upgradeStacks[missing.upgradeId] = missing.minStacks;
      expect(getEligibleEvolutionIds(state)).toContain(evolutionId);
    }
  });
});

describe('evolution unlocks', () => {
  it.each(EVOLUTION_IDS)(
    '%s unlocks once through real upgrade choices and rebuilds exactly',
    (evolutionId) => {
      let state = createHighLevelState();
      const events: EvolutionUnlockEvent[] = [];
      for (const requirement of EVOLUTION_DEFINITIONS[evolutionId].requirements) {
        ({ state } = ensureUpgrade(state, requirement.upgradeId, requirement.minStacks, events));
      }

      expect(state.evolutions[evolutionId]).toBe(true);
      expect(events.filter((event) => event.evolutionId === evolutionId)).toHaveLength(1);
      expect(calculateModifiers(state.upgradeStacks, state.evolutions)).toEqual(state.modifiers);
      expect(calculateModifiers(state.upgradeStacks)).toEqual(state.modifiers);

      const firstRequirement = EVOLUTION_DEFINITIONS[evolutionId].requirements[0]!;
      if (
        state.upgradeStacks[firstRequirement.upgradeId] <
        UPGRADE_DEFINITIONS[firstRequirement.upgradeId].maxStacks
      ) {
        const extra = chooseUpgrade(state, firstRequirement.upgradeId);
        expect(extra.applied).toBe(true);
        if (!extra.applied) return;
        expect(extra.evolutionEvents.filter((event) => event.evolutionId === evolutionId)).toHaveLength(0);
        expect(extra.state.evolutions[evolutionId]).toBe(true);
      }
    },
  );

  it('unlocks all five in one reachable build without duplicate events or modifier drift', () => {
    let state = createHighLevelState();
    const events: EvolutionUnlockEvent[] = [];
    const buildOrder: readonly UpgradeId[] = [
      'silverBall',
      'piercingStuds',
      'powerKick',
      'bloodBomb',
      'rapidRecall',
      'garlicTrail',
      'frostCleats',
      'orbitingSpectralBall',
      'stormStuds',
      'ghostPass',
      'voidGoal',
    ];
    for (const upgradeId of buildOrder) ({ state } = ensureUpgrade(state, upgradeId, 1, events));

    expect(events.map((event) => event.evolutionId).sort()).toEqual([...EVOLUTION_IDS].sort());
    expect(EVOLUTION_IDS.every((evolutionId) => state.evolutions[evolutionId])).toBe(true);
    expect(calculateModifiers(state.upgradeStacks, state.evolutions)).toEqual(state.modifiers);
    expect(Object.values(state.modifiers).every(Number.isFinite)).toBe(true);
  });

  it('builds the three cross-weapon evolution mechanics into generic combat modifiers', () => {
    let state = createHighLevelState();
    const events: EvolutionUnlockEvent[] = [];
    for (const upgradeId of [
      'rapidRecall',
      'garlicTrail',
      'frostCleats',
      'silverBall',
      'orbitingSpectralBall',
      'stormStuds',
      'powerKick',
      'bloodBomb',
      'ghostPass',
      'voidGoal',
    ] as const) {
      ({ state } = ensureUpgrade(state, upgradeId, 1, events));
    }

    expect(state.modifiers).toMatchObject({
      garlicTrailDamage: 8,
      garlicSlowAmount: 0.28,
      garlicSlowDuration: 1.6,
      orbitingBallDamage: 11,
      orbitChainDamage: 6,
      orbitChainTargets: 2,
      ghostPassDamageMultiplier: 1.27,
      ghostVoidDamage: 2,
      ghostVoidRadius: 0.25,
      ghostVoidPullStrength: 5,
      ghostVoidDuration: 1.2,
    });
  });
});

function createHighLevelState(): ProgressionState {
  return grantBloodXp(createProgressionState(), totalXpRequiredForLevel(30)).state;
}

function ensureUpgrade(
  initialState: ProgressionState,
  upgradeId: UpgradeId,
  minStacks: number,
  events: EvolutionUnlockEvent[],
): { state: ProgressionState } {
  let state = initialState;
  for (const prerequisite of UPGRADE_DEFINITIONS[upgradeId].prerequisites) {
    ({ state } = ensureUpgrade(state, prerequisite.upgradeId, prerequisite.minStacks, events));
  }
  while (state.upgradeStacks[upgradeId] < minStacks) {
    const choice = chooseUpgrade(state, upgradeId);
    if (!choice.applied) throw new Error(`Unable to apply ${upgradeId}: ${choice.reason}`);
    state = choice.state;
    events.push(...choice.evolutionEvents);
  }
  return { state };
}
