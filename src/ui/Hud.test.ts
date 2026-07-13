import { describe, expect, it } from 'vitest';
import type { BallState } from '../physics/PhysicsWorld';
import { ballStatusLabel } from './Hud';

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
