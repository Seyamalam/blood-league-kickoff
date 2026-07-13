import { describe, expect, it } from 'vitest';
import { damageCountGoalkeeper, spawnCountGoalkeeper, updateCountGoalkeeper } from './index';

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

  it('uses deterministic seeded state', () => {
    expect(spawnCountGoalkeeper({ seed: 77 })).toEqual(spawnCountGoalkeeper({ seed: 77 }));
  });
});
