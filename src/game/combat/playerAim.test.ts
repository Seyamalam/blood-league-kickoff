import { describe, expect, it } from 'vitest';
import { resolvePlayerAim } from './playerAim';

describe('player aim synchronization', () => {
  const origin = { x: 0, z: 0 };

  it('keeps camera intent, facing, and gameplay direction identical with assistance off', () => {
    const aim = resolvePlayerAim(origin, { x: 1, y: 0, z: 0 }, [], 'off');

    expect(aim.rawDirection).toEqual({ x: 1, y: 0, z: 0 });
    expect(aim.direction).toEqual(aim.rawDirection);
    expect(aim.facingYaw).toBeCloseTo(-Math.PI / 2);
    expect(-Math.sin(aim.facingYaw)).toBeCloseTo(aim.direction.x);
    expect(-Math.cos(aim.facingYaw)).toBeCloseTo(aim.direction.z);
  });

  it('exposes the same assisted direction for the guide, character, and shot', () => {
    const target = { id: 7, position: { x: 8, z: 0.8 } };
    const low = resolvePlayerAim(origin, { x: 1, y: 0.12, z: 0 }, [target], 'low');
    const high = resolvePlayerAim(origin, { x: 1, y: 0.12, z: 0 }, [target], 'high');

    expect(low.targetId).toBe(7);
    expect(high.targetId).toBe(7);
    expect(high.direction.z).toBeGreaterThan(low.direction.z);
    expect(high.direction.y).toBe(0.12);
    expect(Math.hypot(high.direction.x, high.direction.y, high.direction.z)).toBeCloseTo(1);
    const horizontalLength = Math.hypot(high.direction.x, high.direction.z);
    expect(-Math.sin(high.facingYaw)).toBeCloseTo(high.direction.x / horizontalLength);
    expect(-Math.cos(high.facingYaw)).toBeCloseTo(high.direction.z / horizontalLength);
  });

  it('falls back deterministically when input is invalid', () => {
    const aim = resolvePlayerAim(origin, { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: 0 }, [], 'high');

    expect(aim.direction).toEqual({ x: 0, y: 0, z: -1 });
    expect(aim.facingYaw).toBe(0);
  });
});
