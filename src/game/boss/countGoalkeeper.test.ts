import { describe, expect, it } from 'vitest';
import {
  COUNT_GOALKEEPER_COMBAT_TARGET_ID,
  damageCountGoalkeeper,
  isCountGoalkeeperDamageable,
  spawnCountGoalkeeper,
  updateCountGoalkeeper,
} from './index';

describe('Count Goalkeeper', () => {
  it('finishes its entrance before accepting damage', () => {
    const spawned = spawnCountGoalkeeper({ seed: 123 });
    expect(damageCountGoalkeeper(spawned, { amount: 20, source: 'ball' }).appliedDamage).toBe(0);
    const entered = updateCountGoalkeeper(spawned, {
      dt: 0.1,
      playerPosition: { x: 0, y: 0.9, z: 5 },
    });
    expect(entered.state.phase).toBe('entrance');
  });

  it('transitions health phases and emits defeat', () => {
    let state = spawnCountGoalkeeper({ seed: 123 });
    state = { ...state, phase: 'guarding', phaseElapsed: 0 };
    const rush = damageCountGoalkeeper(state, { amount: 50, source: 'ball' });
    expect(rush.state.phase).toBe('bloodRush');
    const defeated = damageCountGoalkeeper(
      { ...rush.state, hitInvulnerability: 0 },
      { amount: 1_000, source: 'ball' },
    );
    expect(defeated.state.phase).toBe('defeated');
    expect(defeated.events.some((event) => event.type === 'defeated')).toBe(true);
  });

  it('keeps a collision-safe combat id and scales secondary damage conservatively', () => {
    const spawned = spawnCountGoalkeeper({ seed: 123 });
    expect(COUNT_GOALKEEPER_COMBAT_TARGET_ID).toBeLessThan(0);
    expect(isCountGoalkeeperDamageable(spawned)).toBe(false);
    expect(damageCountGoalkeeper(spawned, { amount: 20, source: 'secondary' }).appliedDamage).toBe(0);

    const guarding = { ...spawned, phase: 'guarding' as const, phaseElapsed: 0 };
    expect(isCountGoalkeeperDamageable(guarding)).toBe(true);
    const secondary = damageCountGoalkeeper(guarding, { amount: 20, source: 'secondary' });
    expect(secondary.appliedDamage).toBe(8);
    expect(secondary.state.health).toBe(112);
  });

  it('can enter a new phase and be defeated by secondary damage', () => {
    let state = spawnCountGoalkeeper({ seed: 123 });
    state = { ...state, phase: 'guarding', phaseElapsed: 0, health: 82 };
    const rush = damageCountGoalkeeper(state, { amount: 10, source: 'secondary' });
    expect(rush.appliedDamage).toBe(4);
    expect(rush.state.phase).toBe('bloodRush');

    const defeated = damageCountGoalkeeper(
      { ...rush.state, hitInvulnerability: 0, secondaryHitInvulnerability: 0, health: 3 },
      { amount: 12, source: 'secondary' },
    );
    expect(defeated.appliedDamage).toBe(3);
    expect(defeated.state.phase).toBe('defeated');
    expect(isCountGoalkeeperDamageable(defeated.state)).toBe(false);
    expect(defeated.events.some((event) => event.type === 'defeated')).toBe(true);
  });

  it('keeps primary and secondary cooldowns independent in the same fixed step', () => {
    const guarding = {
      ...spawnCountGoalkeeper({ seed: 123 }),
      phase: 'guarding' as const,
      phaseElapsed: 0,
    };
    const primary = damageCountGoalkeeper(guarding, { amount: 10, source: 'ball' });
    const secondary = damageCountGoalkeeper(primary.state, { amount: 12, source: 'secondary' });

    expect(primary.appliedDamage).toBe(10);
    expect(secondary.appliedDamage).toBeCloseTo(4.8);
    expect(secondary.state.health).toBeCloseTo(primary.state.health - 4.8);

    const secondaryFirst = damageCountGoalkeeper(guarding, { amount: 12, source: 'secondary' });
    const primarySecond = damageCountGoalkeeper(secondaryFirst.state, { amount: 10, source: 'ball' });
    expect(primarySecond.appliedDamage).toBe(10);
  });

  it('uses deterministic seeded state', () => {
    expect(spawnCountGoalkeeper({ seed: 77 })).toEqual(spawnCountGoalkeeper({ seed: 77 }));
  });
});
