import type { Vec3 } from '../simulation/types';

/**
 * Oversized, regulation-proportioned survivor arena in game-world metres.
 *
 * A regulation 105 x 68 pitch felt cramped once elite formations, pickups and
 * boss attacks overlapped. The larger footprint keeps the familiar football
 * ratio while adding roughly 68% more playable surface area.
 */
export const PITCH_WIDTH = 88;
export const PITCH_LENGTH = 136;
export const PITCH_HALF_WIDTH = PITCH_WIDTH / 2;
export const PITCH_HALF_LENGTH = PITCH_LENGTH / 2;

export const PLAYABLE_HALF_WIDTH = PITCH_HALF_WIDTH - 1;
export const PLAYABLE_HALF_LENGTH = PITCH_HALF_LENGTH - 1;

export const GOAL_WIDTH = 7.32;
export const GOAL_HALF_WIDTH = GOAL_WIDTH / 2;
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2.4;
export const OPPONENT_GOAL_LINE_Z = -PITCH_HALF_LENGTH;
export const HOME_GOAL_LINE_Z = PITCH_HALF_LENGTH;

export const ARENA_WALL_HALF_WIDTH = PITCH_HALF_WIDTH + 1.2;
export const ARENA_WALL_HALF_LENGTH = PITCH_HALF_LENGTH + GOAL_DEPTH + 0.6;

export const GOALKEEPER_GUARD_Z = OPPONENT_GOAL_LINE_Z + 1.35;
export const FOOTBALL_RADIUS = 0.42;

/** True only after the whole ball crosses the opponent goal line below the crossbar. */
export function isBallInsideOpponentGoal(ball: Readonly<Vec3>): boolean {
  return (
    Number.isFinite(ball.x) &&
    Number.isFinite(ball.y) &&
    Number.isFinite(ball.z) &&
    ball.z <= OPPONENT_GOAL_LINE_Z - FOOTBALL_RADIUS &&
    Math.abs(ball.x) <= GOAL_HALF_WIDTH - FOOTBALL_RADIUS &&
    ball.y >= FOOTBALL_RADIUS * 0.75 &&
    ball.y <= GOAL_HEIGHT - FOOTBALL_RADIUS
  );
}
