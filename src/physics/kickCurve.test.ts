import { describe, expect, it } from 'vitest';
import { normalizeKickCurveIntent } from '../game/input/InputController';
import { calculateCurveImpulse } from './PhysicsWorld';

describe('kick curve', () => {
  it('deadzones small charging motion and clamps intentional motion', () => {
    expect(normalizeKickCurveIntent(10)).toBe(0);
    expect(normalizeKickCurveIntent(140)).toBe(1);
    expect(normalizeKickCurveIntent(1_000)).toBe(1);
    expect(normalizeKickCurveIntent(-140)).toBe(-1);
    expect(normalizeKickCurveIntent(Number.NaN)).toBe(0);
  });

  it('bends predictably to the right of forward travel and fades out', () => {
    const right = calculateCurveImpulse({ x: 0, y: 2, z: -24 }, 1, 0, 1 / 60);
    const left = calculateCurveImpulse({ x: 0, y: 2, z: -24 }, -1, 0, 1 / 60);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
    expect(right.y).toBe(0);
    expect(right.z).toBe(0);
    expect(calculateCurveImpulse({ x: 0, y: 0, z: -24 }, 1, 2, 1 / 60)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
