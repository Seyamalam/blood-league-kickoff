import { describe, expect, it } from 'vitest';
import { GoalComboSystem } from './GoalComboSystem';

const ordinary = {
  crossingX: 0,
  ballSpeed: 12,
  shotDistance: 10,
  airborne: false,
  reboundCount: 0,
  setupTouches: 0,
  scoredAt: 10,
};

describe('GoalComboSystem', () => {
  it('preserves the reliable base goal reward', () => {
    expect(new GoalComboSystem().score(ordinary)).toMatchObject({
      totalScore: 1_000,
      combo: 1,
      tags: [],
    });
  });

  it('stacks readable bonuses for expressive football finishes', () => {
    const result = new GoalComboSystem().score({
      ...ordinary,
      crossingX: 5,
      ballSpeed: 24,
      shotDistance: 28,
      airborne: true,
      reboundCount: 1,
      setupTouches: 3,
    });
    expect(result.tags).toEqual(['long-shot', 'volley', 'rebound', 'team-move', 'placement']);
    expect(result.styleScore).toBe(1_450);
    expect(result.totalScore).toBe(3_200);
    expect(result.label).toBe('NIGHT VOLLEY');
  });

  it('builds a capped streak inside the combo window and resets outside it', () => {
    const system = new GoalComboSystem();
    system.score(ordinary);
    expect(system.score({ ...ordinary, scoredAt: 35 }).combo).toBe(2);
    expect(system.score({ ...ordinary, scoredAt: 50 }).comboMultiplier).toBeCloseTo(1.24);
    expect(system.score({ ...ordinary, scoredAt: 100 }).combo).toBe(1);
  });

  it('is deterministic and resettable', () => {
    const system = new GoalComboSystem();
    const first = system.score({ ...ordinary, scoredAt: Number.NaN });
    system.reset();
    expect(system.score({ ...ordinary, scoredAt: Number.NaN })).toEqual(first);
  });
});
