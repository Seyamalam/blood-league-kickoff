import { describe, expect, it } from 'vitest';
import type { BallState } from '../physics/PhysicsWorld';
import { ballStatusLabel, healthPercent } from './Hud';

describe('ball status accessibility labels', () => {
  it('names every state explicitly with a unique action label', () => {
    const states: readonly BallState[] = ['possessed', 'free', 'recalling', 'volley-window', 'recovering'];
    const labels = states.map(ballStatusLabel);

    expect(labels).toEqual([
      'POSSESSED · READY',
      'FREE · HOLD E TO RECALL',
      'RECALLING · RETURNING',
      'VOLLEY · KICK NOW!',
      'RECOVERING · AUTO RETURN',
    ]);
    expect(new Set(labels).size).toBe(states.length);
  });
});

describe('health HUD presentation', () => {
  it('uses maximum health for passive and character vitality bonuses', () => {
    expect(healthPercent(80, 160)).toBe(50);
    expect(healthPercent(160, 160)).toBe(100);
    expect(healthPercent(200, 160)).toBe(100);
    expect(healthPercent(-5, 160)).toBe(0);
    expect(healthPercent(Number.NaN, 160)).toBe(0);
  });
});
