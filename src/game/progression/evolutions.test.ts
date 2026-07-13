import { describe, expect, it } from 'vitest';
import {
  calculateModifiers,
  chooseUpgrade,
  createProgressionState,
  getEligibleEvolutionIds,
  grantBloodXp,
  totalXpRequiredForLevel,
} from './index';

describe('evolutions', () => {
  it('automatically unlocks Moon Breaker after its second requirement', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(4)).state;
    const silver = chooseUpgrade(state, 'silverBall');
    expect(silver.applied).toBe(true);
    if (!silver.applied) return;
    state = silver.state;
    expect(getEligibleEvolutionIds(state)).toEqual([]);

    const studs = chooseUpgrade(state, 'piercingStuds');
    expect(studs.applied).toBe(true);
    if (!studs.applied) return;
    expect(studs.state.evolutions.moonBreaker).toBe(true);
    expect(studs.evolutionEvents.map((event) => event.evolutionId)).toEqual(['moonBreaker']);
    expect(studs.state.modifiers.ballDamageMultiplier).toBeCloseTo(1.87);
    expect(studs.state.modifiers.pierceCount).toBe(3);
  });

  it('automatically unlocks Crimson Meteor and rebuilds its combat bonuses', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(4)).state;
    const power = chooseUpgrade(state, 'powerKick');
    expect(power.applied).toBe(true);
    if (!power.applied) return;
    state = power.state;
    const bomb = chooseUpgrade(state, 'bloodBomb');
    expect(bomb.applied).toBe(true);
    if (!bomb.applied) return;

    expect(bomb.state.evolutions.crimsonMeteor).toBe(true);
    expect(bomb.evolutionEvents[0]?.type).toBe('evolution-unlocked');
    expect(bomb.state.modifiers.bloodBombDamage).toBe(20);
    expect(bomb.state.modifiers.bloodBombRadius).toBeCloseTo(1.1);
    expect(bomb.state.modifiers.kickPowerMultiplier).toBeCloseTo(1.41);

    const rebuilt = calculateModifiers(bomb.state.upgradeStacks, bomb.state.evolutions);
    expect(rebuilt).toEqual(bomb.state.modifiers);
    expect(calculateModifiers(bomb.state.upgradeStacks)).toEqual(bomb.state.modifiers);
  });

  it('does not emit an evolution twice', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(5)).state;
    for (const upgradeId of ['silverBall', 'piercingStuds'] as const) {
      const choice = chooseUpgrade(state, upgradeId);
      expect(choice.applied).toBe(true);
      if (!choice.applied) return;
      state = choice.state;
    }
    const anotherSilver = chooseUpgrade(state, 'silverBall');
    expect(anotherSilver.applied).toBe(true);
    if (!anotherSilver.applied) return;
    expect(anotherSilver.evolutionEvents).toEqual([]);
  });
});
