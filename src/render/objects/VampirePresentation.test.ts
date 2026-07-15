import { describe, expect, it } from 'vitest';
import {
  defeatPose,
  enemyDeathPose,
  goalkeeperEntrancePose,
  minibossEntrancePose,
} from './VampirePresentation';

describe('vampire presentation poses', () => {
  it('raises minibosses and the Count into their authored combat scale', () => {
    expect(minibossEntrancePose(0.9).height).toBeLessThan(0);
    expect(minibossEntrancePose(0).scale).toBe(1);
    expect(goalkeeperEntrancePose(0).height).toBe(2.8);
    expect(goalkeeperEntrancePose(2.4).scale).toBe(1);
  });

  it('keeps defeat and enemy death posing finite and bounded', () => {
    const halfway = defeatPose(0.8);
    expect(halfway.visible).toBe(true);
    expect(halfway.opacity).toBeGreaterThan(0);
    expect(defeatPose(2).visible).toBe(false);
    expect(enemyDeathPose(0.3, 7).rotationZ).toBeLessThan(0);
    expect(enemyDeathPose(1, 8).visible).toBe(false);
  });
});
