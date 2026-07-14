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

  it('turns large-pitch traversal gates into timed, reusable movement boosts', () => {
    const gate = createEnvironmentInteraction(3, 'momentumGate', { x: 12, y: 0, z: -4 });

    expect(updateEnvironmentInteractions([gate], 0.1, { x: 12.5, y: 0, z: -4 })).toEqual([
      expect.objectContaining({
        type: 'momentumBoost',
        interactionId: 3,
        duration: 2.5,
        speedMultiplier: 1.35,
        dashCooldownRefund: 0.75,
      }),
    ]);
    expect(gate.pulseTimer).toBe(7);
    expect(updateEnvironmentInteractions([gate], 1, { x: 12, y: 0, z: -4 })).toEqual([]);
    for (let second = 0; second < 6; second += 1) {
      expect(updateEnvironmentInteractions([gate], 1, { x: 30, y: 0, z: -4 })).toEqual([]);
    }
    expect(updateEnvironmentInteractions([gate], 0, { x: 12, y: 0, z: -4 })).toHaveLength(1);
  });

  it('does not let the ball consume or damage a momentum gate', () => {
    const gate = createEnvironmentInteraction(4, 'momentumGate', { x: 0, y: 0, z: 0 });

    expect(findInteractionHit([gate], { x: 0, y: 0.4, z: 0 }, 0.5)).toBeUndefined();
    expect(gate.active).toBe(true);
  });
});
