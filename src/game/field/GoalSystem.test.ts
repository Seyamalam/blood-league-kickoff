import { describe, expect, it } from 'vitest';
import { FOOTBALL_RADIUS, GOAL_HALF_WIDTH, GOAL_HEIGHT, OPPONENT_GOAL_LINE_Z } from './config';
import { detectOpponentGoalCrossing } from './GoalSystem';

describe('swept opponent goal detection', () => {
  const before = OPPONENT_GOAL_LINE_Z - FOOTBALL_RADIUS + 0.3;
  const after = OPPONENT_GOAL_LINE_Z - FOOTBALL_RADIUS - 1.2;

  it('detects a fast whole-ball crossing between the posts', () => {
    expect(
      detectOpponentGoalCrossing({ x: 0, y: 0.7, z: before }, { x: 0.5, y: 0.8, z: after }),
    ).toMatchObject({ side: 'opponent' });
  });

  it('rejects reverse travel, wide shots, and shots above the crossbar', () => {
    expect(detectOpponentGoalCrossing({ x: 0, y: 0.7, z: after }, { x: 0, y: 0.7, z: before })).toBeNull();
    expect(
      detectOpponentGoalCrossing(
        { x: GOAL_HALF_WIDTH, y: 0.7, z: before },
        { x: GOAL_HALF_WIDTH, y: 0.7, z: after },
      ),
    ).toBeNull();
    expect(
      detectOpponentGoalCrossing({ x: 0, y: GOAL_HEIGHT, z: before }, { x: 0, y: GOAL_HEIGHT, z: after }),
    ).toBeNull();
  });
});
