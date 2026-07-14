import { describe, expect, it } from 'vitest';
import {
  ARENA_WALL_HALF_LENGTH,
  ARENA_WALL_HALF_WIDTH,
  GOAL_HALF_WIDTH,
  OPPONENT_GOAL_LINE_Z,
} from '../game/field';
import { detectOpponentGoalCrossing } from '../game/field/GoalSystem';
import type { Vec3 } from '../game/simulation/types';
import { PhysicsWorld } from './PhysicsWorld';

const STEP = 1 / 60;
const PLAYER: Vec3 = { x: 0, y: 0.9, z: 5 };

describe('PhysicsWorld recovery', () => {
  it('keeps corner rebounds finite and inside the stadium walls', async () => {
    const physics = await PhysicsWorld.create();
    const cornerPlayer = { x: 20.4, y: 0.9, z: 12.2 };
    expect(physics.kick(cornerPlayer, normalized(1, 0, 1), 1)).not.toBeNull();

    stepWorld(physics, cornerPlayer, 2.5);
    const ball = physics.ballPosition;
    expect(Number.isFinite(ball.x) && Number.isFinite(ball.y) && Number.isFinite(ball.z)).toBe(true);
    expect(Math.abs(ball.x)).toBeLessThan(ARENA_WALL_HALF_WIDTH);
    expect(Math.abs(ball.z)).toBeLessThan(ARENA_WALL_HALF_LENGTH);
    expect(physics.ballSpeed).toBeLessThanOrEqual(physics.maxBallSpeed + 0.001);
  });

  it('resets an out-of-bounds launch to safe possession', async () => {
    const physics = await PhysicsWorld.create();
    expect(
      physics.kick({ x: ARENA_WALL_HALF_WIDTH + 8, y: 0.9, z: 0 }, { x: 1, y: 0, z: 0 }, 1),
    ).not.toBeNull();
    physics.step(PLAYER, Math.PI, STEP);

    expect(physics.ballState).toBe('possessed');
    expect(physics.ballSpeed).toBe(0);
    expect(physics.ballPosition.x).toBeCloseTo(PLAYER.x);
    expect(physics.ballPosition.z).toBeCloseTo(PLAYER.z - 1.1);
  });

  it('automatically recovers a deliberately stalled ball', async () => {
    const physics = await PhysicsWorld.create();
    expect(physics.kick(PLAYER, { x: 0, y: 0, z: -1 }, 0)).not.toBeNull();
    const zeroNormal = { x: 0, y: 0, z: 0 };
    const distantPlayer = { x: 12, y: 0.9, z: 10 };
    // Repeatedly damp before each step to model a ball pinned in clutter. This
    // reaches the real stalled-time branch without a state-mutation test hook.
    for (let index = 0; index < 90; index += 1) {
      physics.applyBallRebound(zeroNormal, 0.25);
      physics.applyBallRebound(zeroNormal, 0.25);
      physics.step(distantPlayer, Math.PI, STEP);
    }
    expect(['recovering', 'possessed']).toContain(physics.ballState);
  });

  it('recalls and catches a freely moving ball', async () => {
    const physics = await PhysicsWorld.create();
    expect(physics.kick(PLAYER, { x: 0, y: 0, z: -1 }, 0.7)).not.toBeNull();
    stepWorld(physics, PLAYER, 0.45);
    physics.setRecall(true);

    for (let index = 0; index < 360 && !physics.ballPossessed; index += 1) {
      physics.step(PLAYER, Math.PI, STEP);
    }
    expect(physics.ballState).toBe('possessed');
    expect(physics.ballSpeed).toBe(0);
  });

  it('turns an enemy tackle into a recoverable loose-ball state', async () => {
    const physics = await PhysicsWorld.create();
    expect(physics.knockBallLoose(PLAYER, { x: 1, y: 0, z: 0 }, 10)).toBe(true);
    expect(physics.ballState).toBe('free');
    expect(physics.ballVelocity.x).toBeGreaterThan(9);
    expect(physics.knockBallLoose(PLAYER, { x: -1, y: 0, z: 0 })).toBe(false);
    physics.setRecall(true);
    for (let index = 0; index < 360 && !physics.ballPossessed; index += 1) {
      physics.step(PLAYER, Math.PI, STEP);
    }
    expect(physics.ballPossessed).toBe(true);
  });

  it('supports distinct controlled ground and lob passes', async () => {
    const physics = await PhysicsWorld.create();
    const ground = physics.pass(PLAYER, { x: 0, y: 0, z: -1 }, 'ground-pass');
    expect(ground?.kind).toBe('ground-pass');
    expect(physics.ballVelocity.y).toBeLessThan(2);
    physics.reset(PLAYER);
    const lob = physics.pass(PLAYER, { x: 0, y: 0, z: -1 }, 'lob-pass');
    expect(lob?.kind).toBe('lob-pass');
    expect(physics.ballVelocity.y).toBeGreaterThan(8);
  });

  it('physically rebounds a shot from an opponent goalpost', async () => {
    const physics = await PhysicsWorld.create();
    const shooter = { x: GOAL_HALF_WIDTH, y: 0.9, z: OPPONENT_GOAL_LINE_Z + 6 };
    expect(physics.kick(shooter, { x: 0, y: 0, z: -1 }, 1)).not.toBeNull();

    let rebounded = false;
    for (let index = 0; index < 45; index += 1) {
      physics.step(shooter, 0, STEP);
      if (physics.ballVelocity.z > 0.5) rebounded = true;
    }

    expect(rebounded).toBe(true);
    expect(physics.ballPosition.z).toBeGreaterThan(OPPONENT_GOAL_LINE_Z - 1);
  });

  it('allows a centered shot through the physical frame and across the scoring plane', async () => {
    const physics = await PhysicsWorld.create();
    const shooter = { x: 0, y: 0.9, z: OPPONENT_GOAL_LINE_Z + 6 };
    expect(physics.kick(shooter, { x: 0, y: 0, z: -1 }, 1)).not.toBeNull();

    let scored = false;
    for (let index = 0; index < 45; index += 1) {
      physics.step(shooter, 0, STEP);
      scored ||= detectOpponentGoalCrossing(physics.previousBallStepPosition, physics.ballPosition) !== null;
    }

    expect(scored).toBe(true);
  });

  it('reset clears motion, recovery, and curved-flight state', async () => {
    const physics = await PhysicsWorld.create();
    expect(physics.kick(PLAYER, { x: 0, y: 0, z: -1 }, 1, {}, 1)).not.toBeNull();
    expect(physics.ballCurveActive).toBe(true);
    physics.setRecall(true);
    physics.step(PLAYER, Math.PI, STEP);
    expect(physics.ballCurveActive).toBe(false);

    physics.reset({ x: -3, y: 0.9, z: 2 });
    expect(physics.ballState).toBe('possessed');
    expect(physics.ballCurveActive).toBe(false);
    expect(physics.ballSpeed).toBe(0);
    expect(physics.ballPosition.x).toBeCloseTo(-3);
    expect(physics.ballPosition.y).toBeCloseTo(0.42);
    expect(physics.ballPosition.z).toBeCloseTo(0.9);
  });
});

function stepWorld(physics: PhysicsWorld, player: Vec3, seconds: number): void {
  const steps = Math.ceil(seconds / STEP);
  for (let index = 0; index < steps; index += 1) physics.step(player, Math.PI, STEP);
}

function normalized(x: number, y: number, z: number): Vec3 {
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}
