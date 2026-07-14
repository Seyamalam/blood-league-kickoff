import { describe, expect, it } from 'vitest';
import { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import { calculateAimGuideLength } from './AimGuide';

describe('aim guide projection', () => {
  it('reaches the first rectangular pitch boundary', () => {
    expect(calculateAimGuideLength({ x: 0, y: 0.9, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(PITCH_HALF_WIDTH);
    expect(calculateAimGuideLength({ x: 0, y: 0.9, z: 0 }, { x: 0, y: 0, z: -1 })).toBe(PITCH_HALF_LENGTH);
  });

  it('returns no lane for a non-horizontal direction', () => {
    expect(calculateAimGuideLength({ x: 0, y: 0.9, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
  });
});
