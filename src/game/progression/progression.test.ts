import { describe, expect, it } from 'vitest';
import {
  chooseUpgrade,
  createProgressionState,
  createSeededRandom,
  createUpgradeOffer,
  getUpgradeAvailability,
  grantBloodXp,
  totalXpRequiredForLevel,
} from './index';

describe('progression', () => {
  it('queues every crossed level from a large XP grant', () => {
    const initial = createProgressionState();
    const result = grantBloodXp(initial, totalXpRequiredForLevel(5));
    expect(result.state.level).toBe(5);
    expect(result.state.pendingLevelUps).toBe(4);
    expect(initial.level).toBe(1);
  });

  it('applies upgrades without modifier drift', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(3)).state;
    const first = chooseUpgrade(state, 'powerKick');
    expect(first.applied).toBe(true);
    if (!first.applied) return;
    state = first.state;
    const second = chooseUpgrade(state, 'powerKick');
    expect(second.applied).toBe(true);
    if (!second.applied) return;
    expect(second.state.modifiers.kickPowerMultiplier).toBeCloseTo(1.32);
  });

  it('enforces prerequisites and produces deterministic offers', () => {
    const levelTwo = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(2)).state;
    expect(getUpgradeAvailability(levelTwo, 'piercingStuds')).toEqual({
      available: false,
      reason: 'prerequisite',
    });
    const offerA = createUpgradeOffer(levelTwo, createSeededRandom(42));
    const offerB = createUpgradeOffer(levelTwo, createSeededRandom(42));
    expect(offerA).toEqual(offerB);
    expect(new Set(offerA).size).toBe(offerA.length);
  });

  it('unlocks Storm Studs after Silver Ball and stacks bounded lightning modifiers', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(4)).state;
    const silver = chooseUpgrade(state, 'silverBall');
    expect(silver.applied).toBe(true);
    if (!silver.applied) return;
    state = silver.state;
    const firstStorm = chooseUpgrade(state, 'stormStuds');
    expect(firstStorm.applied).toBe(true);
    if (!firstStorm.applied) return;
    const secondStorm = chooseUpgrade(firstStorm.state, 'stormStuds');
    expect(secondStorm.applied).toBe(true);
    if (!secondStorm.applied) return;
    expect(secondStorm.state.modifiers.chainLightningDamage).toBe(12);
    expect(secondStorm.state.modifiers.chainLightningTargets).toBe(2);
  });

  it('unlocks Frost Cleats after Rapid Recall and stacks its burst and slow', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(4)).state;
    const recall = chooseUpgrade(state, 'rapidRecall');
    expect(recall.applied).toBe(true);
    if (!recall.applied) return;
    state = recall.state;
    const firstFrost = chooseUpgrade(state, 'frostCleats');
    expect(firstFrost.applied).toBe(true);
    if (!firstFrost.applied) return;
    const secondFrost = chooseUpgrade(firstFrost.state, 'frostCleats');
    expect(secondFrost.applied).toBe(true);
    if (!secondFrost.applied) return;
    expect(secondFrost.state.modifiers.frostBurstDamage).toBe(10);
    expect(secondFrost.state.modifiers.frostSlowAmount).toBeCloseTo(0.2);
    expect(secondFrost.state.modifiers.frostSlowDuration).toBeCloseTo(0.9);
  });

  it('unlocks Spectral Volley from an orbiting ball and caps through upgrade stacks', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(6)).state;
    const orbit = chooseUpgrade(state, 'orbitingSpectralBall');
    expect(orbit.applied).toBe(true);
    if (!orbit.applied) return;
    state = orbit.state;
    for (let stack = 0; stack < 4; stack += 1) {
      const choice = chooseUpgrade(state, 'spectralVolley');
      expect(choice.applied).toBe(true);
      if (!choice.applied) return;
      state = choice.state;
    }
    expect(state.modifiers.multiBallCount).toBe(4);
    expect(state.modifiers.multiBallDamageMultiplier).toBeCloseTo(1.28);
  });

  it('unlocks Void Goal after Blood Bomb and stacks bounded gravity modifiers', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(7)).state;
    const power = chooseUpgrade(state, 'powerKick');
    expect(power.applied).toBe(true);
    if (!power.applied) return;
    state = power.state;
    const bomb = chooseUpgrade(state, 'bloodBomb');
    expect(bomb.applied).toBe(true);
    if (!bomb.applied) return;
    state = bomb.state;
    const voidGoal = chooseUpgrade(state, 'voidGoal');
    expect(voidGoal.applied).toBe(true);
    if (!voidGoal.applied) return;
    expect(voidGoal.state.modifiers.blackHoleDamage).toBeCloseTo(1.25);
    expect(voidGoal.state.modifiers.blackHolePullStrength).toBe(3);
    expect(voidGoal.state.modifiers.blackHoleDuration).toBeCloseTo(0.8);
  });
});
