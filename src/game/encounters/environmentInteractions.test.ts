import { describe, expect, it } from 'vitest';
import {
  createEnvironmentInteraction,
  damageEnvironmentInteraction,
  findInteractionHit,
  updateEnvironmentInteractions,
} from './environmentInteractions';

describe('environment interactions', () => {
  it('detonates a destroyed blood barrel', () => {
    const barrel = createEnvironmentInteraction(1, 'bloodBarrel', { x: 2, y: 0.7, z: 3 });

    expect(damageEnvironmentInteraction(barrel, 1)).toHaveLength(0);
    expect(damageEnvironmentInteraction(barrel, 1)).toEqual([
      expect.objectContaining({ type: 'barrelExploded', radius: 4.2, damage: 8 }),
    ]);
    expect(barrel.active).toBe(false);
  });

  it('emits recurring holy pulses and supports projectile hit queries', () => {
    const beacon = createEnvironmentInteraction(2, 'holyBeacon', { x: 0, y: 0.7, z: 0 });

    expect(findInteractionHit([beacon], { x: 1, y: 0.7, z: 0 }, 0.5)).toBe(beacon);
    expect(updateEnvironmentInteractions([beacon], 0.8)).toEqual([
      expect.objectContaining({ type: 'holyPulse', interactionId: 2 }),
    ]);
  });
});
