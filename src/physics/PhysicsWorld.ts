import RAPIER from '@dimforge/rapier3d-compat';
import type { ProgressionModifiers } from '../game/progression';
import type { Vec3 } from '../game/simulation/types';

const BALL_RADIUS = 0.42;
const MAX_BALL_SPEED = 36;
const MAX_UPGRADED_BALL_SPEED = 54;
const VOLLEY_WINDOW_DISTANCE = 2.35;
const CATCH_DISTANCE = 0.95;

export type BallState = 'possessed' | 'free' | 'recalling' | 'volley-window' | 'recovering';
export type KickResult = {
  kind: 'kick';
  charge: number;
  perfectVolley: boolean;
  speed: number;
};

/** Upgrade values consumed by ball physics. Full ProgressionModifiers is structurally compatible. */
export type BallCombatModifiers = Partial<Pick<
  ProgressionModifiers,
  'kickPowerMultiplier' | 'ballSpeedMultiplier' | 'recallSpeedMultiplier'
>>;

export class PhysicsWorld {
  private readonly world: RAPIER.World;
  private readonly playerBody: RAPIER.RigidBody;
  private readonly ballBody: RAPIER.RigidBody;
  private possessed = true;
  private recallRequested = false;
  private automaticRecall = false;
  private volleyWindow = false;
  private speedCap = MAX_BALL_SPEED;
  private recallSpeedMultiplier = 1;
  private volleyWindowBonus = 0;
  private previousBallPosition: Vec3 = { x: 0, y: BALL_RADIUS, z: 3.8 };
  private unpossessedTime = 0;
  private stalledTime = 0;

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -12, z: 0 });
    this.world.integrationParameters.dt = 1 / 60;

    const floor = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(23, 0.1, 15).setTranslation(0, -0.1, 0).setFriction(0.65).setRestitution(0.38),
      floor,
    );
    this.addWall(0, 1.5, -15.2, 23.5, 1.5, 0.2);
    this.addWall(0, 1.5, 15.2, 23.5, 1.5, 0.2);
    this.addWall(-23.2, 1.5, 0, 0.2, 1.5, 15);
    this.addWall(23.2, 1.5, 0, 0.2, 1.5, 15);

    this.playerBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.9, 5),
    );
    this.world.createCollider(RAPIER.ColliderDesc.capsule(0.48, 0.42), this.playerBody);

    this.ballBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, BALL_RADIUS, 3.8)
        .setLinearDamping(0.24)
        .setAngularDamping(0.18)
        .setCcdEnabled(true)
        .setCanSleep(false),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.ball(BALL_RADIUS).setDensity(0.7).setFriction(0.62).setRestitution(0.82),
      this.ballBody,
    );
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();
    return new PhysicsWorld();
  }

  get ballPossessed(): boolean {
    return this.possessed;
  }

  get ballState(): BallState {
    if (this.possessed) return 'possessed';
    if (this.volleyWindow) return 'volley-window';
    if (this.recallRequested) return 'recalling';
    if (this.automaticRecall) return 'recovering';
    return 'free';
  }

  get maxBallSpeed(): number {
    return this.speedCap;
  }

  get ballPosition(): Vec3 {
    const p = this.ballBody.translation();
    return { x: p.x, y: p.y, z: p.z };
  }

  get ballVelocity(): Vec3 {
    const velocity = this.ballBody.linvel();
    return { x: velocity.x, y: velocity.y, z: velocity.z };
  }

  get ballSpeed(): number {
    const velocity = this.ballBody.linvel();
    return Math.hypot(velocity.x, velocity.y, velocity.z);
  }

  ballRenderPosition(alpha: number): Vec3 {
    const current = this.ballPosition;
    const t = Math.max(0, Math.min(1, alpha));
    return {
      x: this.previousBallPosition.x + (current.x - this.previousBallPosition.x) * t,
      y: this.previousBallPosition.y + (current.y - this.previousBallPosition.y) * t,
      z: this.previousBallPosition.z + (current.z - this.previousBallPosition.z) * t,
    };
  }

  syncPlayer(position: Vec3): void {
    this.playerBody.setNextKinematicTranslation(position);
  }

  kick(
    origin: Vec3,
    direction: Vec3,
    charge = 0,
    modifiers: Readonly<BallCombatModifiers> = {},
  ): KickResult | null {
    const perfectVolley = !this.possessed && this.volleyWindow;
    if (!this.possessed && !perfectVolley) return null;
    const normalizedCharge = Math.max(0, Math.min(1, charge));
    const kickPowerMultiplier = safeMultiplier(modifiers.kickPowerMultiplier, 0.5, 2);
    const ballSpeedMultiplier = safeMultiplier(modifiers.ballSpeedMultiplier, 0.5, 1.5);
    this.speedCap = Math.min(MAX_UPGRADED_BALL_SPEED, MAX_BALL_SPEED * ballSpeedMultiplier);
    const launchSpeed = Math.min(
      this.speedCap,
      (20 + normalizedCharge * 12) * (perfectVolley ? 1.12 : 1) * kickPowerMultiplier,
    );
    this.possessed = false;
    this.recallRequested = false;
    this.automaticRecall = false;
    this.volleyWindow = false;
    this.ballBody.setTranslation(
      { x: origin.x + direction.x * 1.15, y: 0.62, z: origin.z + direction.z * 1.15 },
      true,
    );
    this.ballBody.setLinvel(
      {
        x: direction.x * launchSpeed,
        y: Math.max(2.4, direction.y * launchSpeed * 0.72 + 2.4),
        z: direction.z * launchSpeed,
      },
      true,
    );
    this.ballBody.setAngvel({ x: direction.z * 20, y: 0, z: -direction.x * 20 }, true);
    return { kind: 'kick', charge: normalizedCharge, perfectVolley, speed: launchSpeed };
  }

  setRecall(active: boolean, modifiers: Readonly<BallCombatModifiers> = {}, volleyWindowBonus = 0): void {
    this.recallRequested = active;
    this.recallSpeedMultiplier = safeMultiplier(modifiers.recallSpeedMultiplier, 0.5, 2);
    this.volleyWindowBonus = Number.isFinite(volleyWindowBonus) ? Math.max(0, Math.min(0.8, volleyWindowBonus)) : 0;
  }

  applyBallRebound(normal: Readonly<Vec3>, velocityMultiplier = 0.82): void {
    if (this.possessed) return;
    const velocity = this.ballBody.linvel();
    const dot = velocity.x * normal.x + velocity.y * normal.y + velocity.z * normal.z;
    const scale = Number.isFinite(velocityMultiplier) ? Math.max(0.25, Math.min(1.2, velocityMultiplier)) : 0.82;
    this.ballBody.setLinvel({
      x: (velocity.x - 2 * dot * normal.x) * scale,
      y: Math.max(1.8, (velocity.y - 2 * dot * normal.y) * scale),
      z: (velocity.z - 2 * dot * normal.z) * scale,
    }, true);
  }

  step(playerPosition: Vec3, playerFacing: number, dt: number): void {
    this.previousBallPosition = this.ballPosition;
    const forward = { x: -Math.sin(playerFacing), z: -Math.cos(playerFacing) };
    if (this.possessed) {
      this.unpossessedTime = 0;
      this.stalledTime = 0;
      this.volleyWindow = false;
      this.ballBody.setTranslation(
        { x: playerPosition.x + forward.x * 1.08, y: BALL_RADIUS, z: playerPosition.z + forward.z * 1.08 },
        true,
      );
      this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    } else if (this.recallRequested || this.automaticRecall) {
      const ball = this.ballBody.translation();
      const dx = playerPosition.x - ball.x;
      const dy = 0.75 - ball.y;
      const dz = playerPosition.z - ball.z;
      const distance = Math.max(0.001, Math.hypot(dx, dy, dz));
      const pull = Math.min(70, (19 + distance * 2.8) * this.recallSpeedMultiplier);
      this.ballBody.applyImpulse({ x: (dx / distance) * pull * dt, y: (dy / distance) * pull * dt, z: (dz / distance) * pull * dt }, true);
      this.volleyWindow = distance <= VOLLEY_WINDOW_DISTANCE + this.volleyWindowBonus;
      if (distance < CATCH_DISTANCE) {
        this.possessed = true;
        this.recallRequested = false;
        this.automaticRecall = false;
        this.volleyWindow = false;
      }
    } else {
      this.volleyWindow = false;
    }

    if (!this.possessed) {
      this.unpossessedTime += dt;
      this.stalledTime = this.ballSpeed < 0.4 ? this.stalledTime + dt : 0;
      if (this.unpossessedTime > 7 || this.stalledTime > 1.35) this.automaticRecall = true;
    }

    this.world.integrationParameters.dt = dt;
    this.world.step();
    this.limitBallSpeed();

    const ball = this.ballBody.translation();
    if (
      !Number.isFinite(ball.x) || !Number.isFinite(ball.y) || !Number.isFinite(ball.z)
      || ball.y < -4 || Math.abs(ball.x) > 30 || Math.abs(ball.z) > 22
    ) {
      this.reset(playerPosition);
    }
  }

  reset(playerPosition: Vec3): void {
    this.possessed = true;
    this.recallRequested = false;
    this.automaticRecall = false;
    this.volleyWindow = false;
    this.speedCap = MAX_BALL_SPEED;
    this.recallSpeedMultiplier = 1;
    this.volleyWindowBonus = 0;
    this.unpossessedTime = 0;
    this.stalledTime = 0;
    this.previousBallPosition = { x: playerPosition.x, y: BALL_RADIUS, z: playerPosition.z - 1.1 };
    this.ballBody.setTranslation({ x: playerPosition.x, y: BALL_RADIUS, z: playerPosition.z - 1.1 }, true);
    this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  private addWall(x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.3).setRestitution(0.88),
      body,
    );
  }

  private limitBallSpeed(): void {
    const velocity = this.ballBody.linvel();
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    if (speed <= this.speedCap || speed === 0) return;
    const scale = this.speedCap / speed;
    this.ballBody.setLinvel(
      { x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale },
      true,
    );
  }
}

function safeMultiplier(value: number | undefined, min: number, max: number): number {
  if (value === undefined) return 1;
  if (!Number.isFinite(value)) return 1;
  return Math.max(min, Math.min(max, value));
}
