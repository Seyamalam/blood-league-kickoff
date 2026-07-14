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

  it('telegraphs a goal-line dive and parries shots during the dive', () => {
    let state: ReturnType<typeof spawnCountGoalkeeper> = {
      ...spawnCountGoalkeeper({ seed: 123 }),
      phase: 'guarding' as const,
      phaseElapsed: 0,
      actionCooldown: 0,
    };
    const telegraph = updateCountGoalkeeper(state, {
      dt: 0.01,
      playerPosition: { x: 4, y: 0.9, z: 0 },
    });
    expect(telegraph.state.action).toBe('diveTelegraph');
    expect(telegraph.events.some((event) => event.type === 'diveTelegraphed')).toBe(true);

    state = { ...telegraph.state, actionElapsed: 0.48 };
    const dive = updateCountGoalkeeper(state, {
      dt: 0.01,
      playerPosition: { x: 4, y: 0.9, z: 0 },
    });
    expect(dive.state.action).toBe('dive');
    expect(dive.events.some((event) => event.type === 'diveStarted')).toBe(true);

    const parry = damageCountGoalkeeper(dive.state, { amount: 30, source: 'ball' });
    expect(parry.appliedDamage).toBe(0);
    expect(parry.state.action).toBe('counterattack');
    expect(parry.events.map((event) => event.type)).toEqual(['shotParried', 'counterattackStarted']);
  });

  it('releases a parry counterattack then opens a high-damage penalty window', () => {
    const counterattacking = {
      ...spawnCountGoalkeeper({ seed: 123 }),
      phase: 'guarding' as const,
      phaseElapsed: 0,
      action: 'counterattack' as const,
      actionElapsed: 0.55,
    };
    const counter = updateCountGoalkeeper(counterattacking, {
      dt: 0.01,
      playerPosition: { x: 2, y: 0.9, z: 3 },
    });
    expect(counter.state.action).toBe('vulnerable');
    expect(counter.events.map((event) => event.type)).toEqual([
      'counterattackReleased',
      'vulnerabilityOpened',
    ]);

    const penalty = damageCountGoalkeeper(counter.state, { amount: 10, source: 'ball' });
    expect(penalty.appliedDamage).toBe(17.5);
  });

  it('opens a vulnerability window after completing a Blood Rush charge', () => {
    const charging = {
      ...spawnCountGoalkeeper({ seed: 123 }),
      phase: 'bloodRush' as const,
      phaseElapsed: 1,
      action: 'charge' as const,
      actionElapsed: 1.15,
      velocity: { x: 1, y: 0, z: 0 },
    };
    const update = updateCountGoalkeeper(charging, {
      dt: 0.01,
      playerPosition: { x: 0, y: 0.9, z: 0 },
    });
    expect(update.state.action).toBe('vulnerable');
    expect(update.events.some((event) => event.type === 'vulnerabilityOpened')).toBe(true);
  });
});
