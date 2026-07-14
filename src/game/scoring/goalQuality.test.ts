import { describe, expect, it } from 'vitest';
import { evaluateGoalQuality } from './goalQuality';

describe('goal quality', () => {
  it('keeps a reliable base reward for ordinary finishes', () => {
    expect(evaluateGoalQuality(0, 12)).toEqual({
      quality: 'clinical',
      label: 'CLINICAL FINISH',
      score: 1_000,
      ultimateCharge: 24,
    });
  });

  it('rewards powerful central shots', () => {
    expect(evaluateGoalQuality(0.5, 24).quality).toBe('power');
  });

  it('prioritizes a fast top-corner finish', () => {
    expect(evaluateGoalQuality(4.5, 22).quality).toBe('top-corner');
  });
});
