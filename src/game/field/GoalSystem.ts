import type { Vec3 } from '../simulation/types';
import { FOOTBALL_RADIUS, GOAL_HALF_WIDTH, GOAL_HEIGHT, OPPONENT_GOAL_LINE_Z } from './config';

export interface GoalCrossing {
  readonly side: 'opponent';
  readonly crossing: Vec3;
}

/** Swept whole-ball goal test that cannot skip the scoring plane at high speed. */
export function detectOpponentGoalCrossing(
  previous: Readonly<Vec3>,
  current: Readonly<Vec3>,
): GoalCrossing | null {
  const scoringPlane = OPPONENT_GOAL_LINE_Z - FOOTBALL_RADIUS;
  const travel = current.z - previous.z;
  if (!Number.isFinite(travel) || travel >= 0 || previous.z <= scoringPlane || current.z > scoringPlane) {
    return null;
  }
  const t = (scoringPlane - previous.z) / travel;
  if (!Number.isFinite(t) || t < 0 || t > 1) return null;
  const crossing = {
    x: previous.x + (current.x - previous.x) * t,
    y: previous.y + (current.y - previous.y) * t,
    z: scoringPlane,
  };
  if (
    Math.abs(crossing.x) > GOAL_HALF_WIDTH - FOOTBALL_RADIUS ||
    crossing.y < FOOTBALL_RADIUS * 0.75 ||
    crossing.y > GOAL_HEIGHT - FOOTBALL_RADIUS
  ) {
    return null;
  }
  return { side: 'opponent', crossing };
}
