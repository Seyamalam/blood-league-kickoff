import { describe, expect, it } from 'vitest';
import { selectAimAssistTarget, steerAimDirection } from './aimAssist';

describe('aim assist target selection', () => {
  const origin = { x: 0, z: 0 };
  const forward = { x: 1, z: 0 };

  it('does not select a target when disabled', () => {
    expect(selectAimAssistTarget(origin, forward, [{ id: 1, position: { x: 5, z: 0 } }], 'off')).toBeNull();
  });

  it('chooses the candidate closest to the reticle within its range and cone', () => {
    const selected = selectAimAssistTarget(
      origin,
      forward,
      [
        { id: 2, position: { x: 5, z: 0.4 } },
        { id: 1, position: { x: 5, z: 0.1 } },
        { id: 3, position: { x: 11, z: 0 } },
        { id: 4, position: { x: -2, z: 0 } },
      ],
      'low',
    );

    expect(selected?.id).toBe(1);
    expect(selected?.distance).toBeCloseTo(Math.hypot(5, 0.1));
  });

  it('uses distance and stable ID to break equal-alignment ties', () => {
    const selected = selectAimAssistTarget(
      origin,
      forward,
      [
        { id: 9, position: { x: 6, z: 0 } },
        { id: 4, position: { x: 4, z: 0 } },
        { id: 2, position: { x: 4, z: 0 } },
      ],
      'high',
    );

    expect(selected?.id).toBe(2);
  });

  it('gives high assist more correction than low assist', () => {
    const target = { x: Math.cos(Math.PI / 12), z: Math.sin(Math.PI / 12) };
    const low = steerAimDirection(forward, target, 'low');
    const high = steerAimDirection(forward, target, 'high');

    expect(high.z).toBeGreaterThan(low.z);
    expect(Math.hypot(low.x, low.z)).toBeCloseTo(1);
    expect(Math.hypot(high.x, high.z)).toBeCloseTo(1);
    expect(steerAimDirection(forward, target, 'off')).toEqual(forward);
  });
});
