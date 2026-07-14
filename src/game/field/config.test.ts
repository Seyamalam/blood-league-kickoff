import { describe, expect, it } from 'vitest';
import {
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  OPPONENT_GOAL_LINE_Z,
  PITCH_LENGTH,
  PITCH_WIDTH,
  isBallInsideOpponentGoal,
} from './config';

describe('football pitch configuration', () => {
  it('uses a regulation-proportioned rectangular pitch', () => {
    expect(PITCH_LENGTH).toBe(105);
    expect(PITCH_WIDTH).toBe(68);
    expect(PITCH_LENGTH).toBeGreaterThan(PITCH_WIDTH);
  });

  it('requires the ball to fully enter between the posts and below the crossbar', () => {
    expect(isBallInsideOpponentGoal({ x: 0, y: 0.7, z: OPPONENT_GOAL_LINE_Z - 0.5 })).toBe(true);
    expect(isBallInsideOpponentGoal({ x: GOAL_HALF_WIDTH, y: 0.7, z: OPPONENT_GOAL_LINE_Z - 0.5 })).toBe(
      false,
    );
    expect(isBallInsideOpponentGoal({ x: 0, y: GOAL_HEIGHT, z: OPPONENT_GOAL_LINE_Z - 0.5 })).toBe(false);
    expect(isBallInsideOpponentGoal({ x: 0, y: 0.7, z: OPPONENT_GOAL_LINE_Z })).toBe(false);
  });
});
