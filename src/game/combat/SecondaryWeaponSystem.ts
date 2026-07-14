import type { Vec3 } from '../simulation/types';
import type {
  BlackHoleZoneState,
  CombatTarget,
  GarlicZoneState,
  GhostPassState,
  GhostPassTrigger,
  MultiBallShotState,
  MultiBallTrigger,
  OrbitingBallState,
  SecondaryCombatModifiers,
  SecondaryDamageHit,
  SecondaryWeaponEvent,
  SecondaryWeaponRenderState,
  SecondaryWeaponStepInput,
  SecondaryWeaponStepResult,
} from './types';

const GARLIC_ZONE_CAP = 24;
const GARLIC_RADIUS = 0.82;
const GARLIC_LIFETIME = 1.35;
const GARLIC_TICK = 0.36;
const GARLIC_SPACING_SQUARED = 1.05 * 1.05;
const ORBIT_CAP = 3;
const ORBIT_RADIUS = 1.72;
const ORBIT_BALL_RADIUS = 0.36;
const ORBIT_HIT_COOLDOWN = 0.34;
const BLOOD_BOMB_CAP = 8;
const GHOST_PASS_CAP = 8;
const GHOST_PASS_SPEED = 25;
const GHOST_PASS_LIFETIME = 1.45;
const GHOST_PASS_RADIUS = 0.34;
const CHAIN_LIGHTNING_TRIGGER_CAP = 8;
const CHAIN_LIGHTNING_TARGET_CAP = 6;
const CHAIN_LIGHTNING_RANGE = 4.5;
const FROST_BURST_TRIGGER_CAP = 8;
const FROST_BURST_TARGET_CAP = 12;
const FROST_BURST_BASE_RADIUS = 1.25;
const MULTI_BALL_POOL_CAP = 6;
const MULTI_BALL_TRIGGER_CAP = 4;
const MULTI_BALL_SPEED = 22;
const MULTI_BALL_LIFETIME = 1.2;
const MULTI_BALL_RADIUS = 0.3;
const MULTI_BALL_SPREAD_RADIANS = 0.14;
const BLACK_HOLE_POOL_CAP = 4;
const BLACK_HOLE_TARGET_CAP = 16;
const BLACK_HOLE_BASE_RADIUS = 1.6;
const BLACK_HOLE_PULSE_INTERVAL = 0.35;
const HIT_CAP_PER_STEP = 256;
const EVENT_CAP_PER_STEP = 64;

interface GarlicZoneInternal extends GarlicZoneState {
  nextTick: number;
  damage: number;
  slowAmount: number;
  slowDuration: number;
}

interface OrbitingBallInternal extends OrbitingBallState {
  hitTimes: Map<number, number>;
}

interface BloodBombInternal {
  active: boolean;
  position: Vec3;
  radius: number;
  damage: number;
}

interface GhostPassInternal extends GhostPassState {
  damage: number;
  hitTargets: Set<number>;
  spawnEventCount: number;
  voidTriggered: boolean;
  voidDamage: number;
  voidRadius: number;
  voidPullStrength: number;
  voidDuration: number;
}

interface ChainLightningInternal {
  active: boolean;
  originTargetId: number;
  originPosition: Vec3;
  damage: number;
  targetCount: number;
}

interface FrostBurstInternal {
  active: boolean;
  position: Vec3;
  radius: number;
  damage: number;
  speedMultiplier: number;
  slowDuration: number;
}

interface MultiBallInternal extends MultiBallShotState {
  damage: number;
  hitTargets: Set<number>;
  spawnEventCount: number;
  shotIndex: number;
}

interface BlackHoleInternal extends BlackHoleZoneState {
  damage: number;
  pullStrength: number;
  nextPulse: number;
  spawnEventPending: boolean;
}

/**
 * Fixed-step secondary weapon simulation. It owns bounded pools and reports
 * typed damage queries instead of mutating enemies, keeping it independent of
 * game-state storage and rendering.
 */
export class SecondaryWeaponSystem {
  private readonly garlicZones: GarlicZoneInternal[];
  private readonly orbitingBalls: OrbitingBallInternal[];
  private readonly bloodBombs: BloodBombInternal[];
  private readonly ghostPasses: GhostPassInternal[];
  private readonly chainLightningTriggers: ChainLightningInternal[];
  private readonly chainVisitedIds = new Int32Array(CHAIN_LIGHTNING_TARGET_CAP + 1);
  private readonly frostBurstTriggers: FrostBurstInternal[];
  private readonly frostVisitedIds = new Int32Array(FROST_BURST_TARGET_CAP);
  private readonly multiBallShots: MultiBallInternal[];
  private readonly blackHoleZones: BlackHoleInternal[];
  private readonly blackHoleVisitedIds = new Int32Array(BLACK_HOLE_TARGET_CAP);
  private readonly hits: SecondaryDamageHit[] = [];
  private readonly events: SecondaryWeaponEvent[] = [];
  private readonly result: SecondaryWeaponStepResult;
  private readonly visibleState: SecondaryWeaponRenderState;
  private elapsed = 0;
  private garlicCursor = 0;
  private bombCursor = 0;
  private ghostCursor = 0;
  private chainLightningCursor = 0;
  private frostBurstCursor = 0;
  private multiBallCursor = 0;
  private blackHoleCursor = 0;
  private garlicPositionValid = false;
  private previousBallReturning = false;
  private readonly lastGarlicPosition: Vec3 = { x: 0, y: 0, z: 0 };

  constructor() {
    this.garlicZones = Array.from({ length: GARLIC_ZONE_CAP }, createGarlicZone);
    this.orbitingBalls = Array.from({ length: ORBIT_CAP }, createOrbitingBall);
    this.bloodBombs = Array.from({ length: BLOOD_BOMB_CAP }, createBloodBomb);
    this.ghostPasses = Array.from({ length: GHOST_PASS_CAP }, createGhostPass);
    this.chainLightningTriggers = Array.from({ length: CHAIN_LIGHTNING_TRIGGER_CAP }, createChainLightning);
    this.frostBurstTriggers = Array.from({ length: FROST_BURST_TRIGGER_CAP }, createFrostBurst);
    this.multiBallShots = Array.from({ length: MULTI_BALL_POOL_CAP }, createMultiBallShot);
    this.blackHoleZones = Array.from({ length: BLACK_HOLE_POOL_CAP }, createBlackHole);
    this.result = { hits: this.hits, events: this.events };
    this.visibleState = {
      garlicZones: this.garlicZones,
      orbitingBalls: this.orbitingBalls,
      ghostPasses: this.ghostPasses,
      multiBallShots: this.multiBallShots,
      blackHoleZones: this.blackHoleZones,
    };
  }

  get renderState(): SecondaryWeaponRenderState {
    return this.visibleState;
  }

  reset(): void {
    this.elapsed = 0;
    this.garlicCursor = 0;
    this.bombCursor = 0;
    this.ghostCursor = 0;
    this.chainLightningCursor = 0;
    this.frostBurstCursor = 0;
    this.multiBallCursor = 0;
    this.blackHoleCursor = 0;
    this.garlicPositionValid = false;
    this.previousBallReturning = false;
    this.hits.length = 0;
    this.events.length = 0;
    for (const zone of this.garlicZones) zone.active = false;
    for (const orbit of this.orbitingBalls) {
      orbit.active = false;
      orbit.hitTimes.clear();
    }
    for (const bomb of this.bloodBombs) bomb.active = false;
    for (const ghost of this.ghostPasses) {
      ghost.active = false;
      ghost.spawnEventCount = 0;
      ghost.hitTargets.clear();
    }
    for (const chain of this.chainLightningTriggers) chain.active = false;
    for (const burst of this.frostBurstTriggers) burst.active = false;
    for (const shot of this.multiBallShots) {
      shot.active = false;
      shot.spawnEventCount = 0;
      shot.hitTargets.clear();
    }
    for (const zone of this.blackHoleZones) zone.active = false;
  }

  step(input: Readonly<SecondaryWeaponStepInput>): SecondaryWeaponStepResult {
    this.hits.length = 0;
    this.events.length = 0;
    const dt = safeFinite(input.dt, 0, 0.1, 0);
    this.elapsed += dt;

    this.updateGarlicTrail(input, dt);
    this.updateOrbitingBalls(input, dt);
    this.updateBloodBombs(input.targets);
    this.updateChainLightning(input.targets);
    this.updateFrostBursts(input.targets);

    if (input.ballReturning && !this.previousBallReturning) {
      const dx = input.playerPosition.x - input.ballPosition.x;
      const dy = input.playerPosition.y - input.ballPosition.y;
      const dz = input.playerPosition.z - input.ballPosition.z;
      this.triggerGhostPass({
        origin: input.ballPosition,
        direction: { x: dx, y: dy, z: dz },
        baseDamage: input.ballDamage,
        modifiers: input.modifiers,
      });
    }
    this.previousBallReturning = input.ballReturning;
    this.updateGhostPasses(input.targets, dt);
    this.updateMultiBallShots(input.targets, dt);
    this.updateBlackHoles(input.targets, dt);
    return this.result;
  }

  /** Queues a one-tick AoE query; call after a qualifying primary-ball impact/kill. */
  triggerBloodBomb(position: Readonly<Vec3>, modifiers: SecondaryCombatModifiers): boolean {
    const damage = safeFinite(modifiers.bloodBombDamage, 0, 64, 0);
    if (damage <= 0) return false;
    const bonusRadius = safeFinite(modifiers.bloodBombRadius, 0, 2.5, 0);
    const bomb = this.bloodBombs[this.bombCursor]!;
    this.bombCursor = (this.bombCursor + 1) % this.bloodBombs.length;
    bomb.active = true;
    copyPosition(bomb.position, position);
    bomb.damage = damage;
    bomb.radius = Math.min(3.4, 0.9 + bonusRadius);
    return true;
  }

  /** Spawns bounded spectral duplicates. Returns the number actually spawned. */
  triggerGhostPass(trigger: Readonly<GhostPassTrigger>): number {
    const count = Math.floor(safeFinite(trigger.modifiers.ghostPassCount, 0, 3, 0));
    if (count <= 0) return 0;
    const length = Math.hypot(trigger.direction.x, trigger.direction.y, trigger.direction.z);
    if (length < 0.0001) return 0;
    const baseDamage = safeFinite(trigger.baseDamage ?? 1, 0, 32, 1);
    const multiplier = safeFinite(trigger.modifiers.ghostPassDamageMultiplier, 0.25, 3, 1);
    for (let index = 0; index < count; index += 1) {
      const ghost = this.ghostPasses[this.ghostCursor]!;
      this.ghostCursor = (this.ghostCursor + 1) % this.ghostPasses.length;
      const spread = (index - (count - 1) / 2) * 0.095;
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);
      const nx = trigger.direction.x / length;
      const ny = trigger.direction.y / length;
      const nz = trigger.direction.z / length;
      ghost.active = true;
      ghost.age = 0;
      ghost.lifetime = GHOST_PASS_LIFETIME;
      ghost.radius = GHOST_PASS_RADIUS;
      ghost.damage = baseDamage * multiplier;
      ghost.spawnEventCount = index === 0 ? count : 0;
      ghost.voidTriggered = false;
      ghost.voidDamage = safeFinite(trigger.modifiers.ghostVoidDamage, 0, 80, 0);
      ghost.voidRadius = safeFinite(trigger.modifiers.ghostVoidRadius, 0, 3, 0);
      ghost.voidPullStrength = safeFinite(trigger.modifiers.ghostVoidPullStrength, 0, 30, 0);
      ghost.voidDuration = safeFinite(trigger.modifiers.ghostVoidDuration, 0, 8, 0);
      copyPosition(ghost.position, trigger.origin);
      ghost.velocity.x = (nx * cos - nz * sin) * GHOST_PASS_SPEED;
      ghost.velocity.y = ny * GHOST_PASS_SPEED;
      ghost.velocity.z = (nz * cos + nx * sin) * GHOST_PASS_SPEED;
      ghost.hitTargets.clear();
    }
    return count;
  }

  /** Queues a bounded nearest-neighbor lightning chain from a confirmed primary impact. */
  triggerChainLightning(
    originTargetId: number,
    originPosition: Readonly<Vec3>,
    modifiers: SecondaryCombatModifiers,
  ): boolean {
    const damage = safeFinite(modifiers.chainLightningDamage, 0, 80, 0);
    const targetCount = Math.floor(
      safeFinite(modifiers.chainLightningTargets, 0, CHAIN_LIGHTNING_TARGET_CAP, 0),
    );
    if (!Number.isInteger(originTargetId) || damage <= 0 || targetCount <= 0) return false;
    return this.queueChainLightning(originTargetId, originPosition, damage, targetCount);
  }

  private queueChainLightning(
    originTargetId: number,
    originPosition: Readonly<Vec3>,
    damage: number,
    targetCount: number,
  ): boolean {
    if (!Number.isInteger(originTargetId) || damage <= 0 || targetCount <= 0) return false;
    const chain = this.chainLightningTriggers[this.chainLightningCursor]!;
    this.chainLightningCursor = (this.chainLightningCursor + 1) % this.chainLightningTriggers.length;
    chain.active = true;
    chain.originTargetId = originTargetId;
    copyPosition(chain.originPosition, originPosition);
    chain.damage = damage;
    chain.targetCount = targetCount;
    return true;
  }

  /** Queues a bounded frost burst; slow application is reported as typed events. */
  triggerFrostBurst(position: Readonly<Vec3>, modifiers: SecondaryCombatModifiers): boolean {
    const damage = safeFinite(modifiers.frostBurstDamage, 0, 80, 0);
    if (damage <= 0) return false;
    const bonusRadius = safeFinite(modifiers.frostBurstRadius, 0, 3, 0);
    const slowAmount = safeFinite(modifiers.frostSlowAmount, 0, 0.8, 0);
    const slowDuration = safeFinite(modifiers.frostSlowDuration, 0, 6, 0);
    const burst = this.frostBurstTriggers[this.frostBurstCursor]!;
    this.frostBurstCursor = (this.frostBurstCursor + 1) % this.frostBurstTriggers.length;
    burst.active = true;
    copyPosition(burst.position, position);
    burst.radius = Math.min(4.25, FROST_BURST_BASE_RADIUS + bonusRadius);
    burst.damage = damage;
    burst.speedMultiplier = 1 - slowAmount;
    burst.slowDuration = slowDuration;
    return true;
  }

  /** Spawns a small, fixed-pool fan of spectral shots from a confirmed primary impact. */
  triggerMultiBall(trigger: Readonly<MultiBallTrigger>): number {
    const count = Math.floor(safeFinite(trigger.modifiers.multiBallCount, 0, MULTI_BALL_TRIGGER_CAP, 0));
    const damageMultiplier = safeFinite(trigger.modifiers.multiBallDamageMultiplier, 0, 3, 0);
    const baseDamage = safeFinite(trigger.baseDamage, 0, 64, 0);
    const length = Math.hypot(trigger.direction.x, trigger.direction.y, trigger.direction.z);
    if (count <= 0 || damageMultiplier <= 0 || baseDamage <= 0 || length < 0.0001) return 0;

    const nx = trigger.direction.x / length;
    const ny = trigger.direction.y / length;
    const nz = trigger.direction.z / length;
    for (let index = 0; index < count; index += 1) {
      const shot = this.multiBallShots[this.multiBallCursor]!;
      this.multiBallCursor = (this.multiBallCursor + 1) % this.multiBallShots.length;
      const spread = (index - (count - 1) / 2) * MULTI_BALL_SPREAD_RADIANS;
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);
      shot.active = true;
      shot.age = 0;
      shot.damage = baseDamage * damageMultiplier;
      shot.spawnEventCount = index === 0 ? count : 0;
      shot.shotIndex = index;
      copyPosition(shot.position, trigger.origin);
      shot.velocity.x = (nx * cos - nz * sin) * MULTI_BALL_SPEED;
      shot.velocity.y = ny * MULTI_BALL_SPEED;
      shot.velocity.z = (nz * cos + nx * sin) * MULTI_BALL_SPEED;
      shot.hitTargets.clear();
    }
    return count;
  }

  /** Queues a temporary pull/damage zone without mutating target movement. */
  triggerBlackHole(position: Readonly<Vec3>, modifiers: SecondaryCombatModifiers): boolean {
    const damage = safeFinite(modifiers.blackHoleDamage, 0, 80, 0);
    const pullStrength = safeFinite(modifiers.blackHolePullStrength, 0, 30, 0);
    const duration = safeFinite(modifiers.blackHoleDuration, 0, 8, 0);
    if ((damage <= 0 && pullStrength <= 0) || duration <= 0) return false;
    const bonusRadius = safeFinite(modifiers.blackHoleRadius, 0, 3, 0);
    return this.spawnBlackHole(position, damage, bonusRadius, pullStrength, duration);
  }

  private spawnBlackHole(
    position: Readonly<Vec3>,
    damage: number,
    bonusRadius: number,
    pullStrength: number,
    duration: number,
  ): boolean {
    if ((damage <= 0 && pullStrength <= 0) || duration <= 0) return false;
    const zone = this.blackHoleZones[this.blackHoleCursor]!;
    this.blackHoleCursor = (this.blackHoleCursor + 1) % this.blackHoleZones.length;
    zone.active = true;
    copyPosition(zone.position, position);
    zone.radius = Math.min(4.6, BLACK_HOLE_BASE_RADIUS + bonusRadius);
    zone.age = 0;
    zone.lifetime = duration;
    zone.damage = damage;
    zone.pullStrength = pullStrength;
    zone.nextPulse = 0;
    zone.spawnEventPending = true;
    return true;
  }

  private updateGarlicTrail(input: Readonly<SecondaryWeaponStepInput>, dt: number): void {
    const damage = safeFinite(input.modifiers.garlicTrailDamage, 0, 40, 0);
    if (damage > 0 && input.ballInFlight && input.ballSpeed >= 7) {
      const dx = input.ballPosition.x - this.lastGarlicPosition.x;
      const dz = input.ballPosition.z - this.lastGarlicPosition.z;
      if (!this.garlicPositionValid || dx * dx + dz * dz >= GARLIC_SPACING_SQUARED) {
        this.spawnGarlicZone(
          input.ballPosition,
          damage,
          safeFinite(input.modifiers.garlicSlowAmount, 0, 0.8, 0),
          safeFinite(input.modifiers.garlicSlowDuration, 0, 6, 0),
        );
        copyPosition(this.lastGarlicPosition, input.ballPosition);
        this.garlicPositionValid = true;
      }
    } else {
      this.garlicPositionValid = false;
    }

    for (const zone of this.garlicZones) {
      if (!zone.active) continue;
      zone.age += dt;
      if (zone.age >= zone.lifetime) {
        zone.active = false;
        continue;
      }
      if (zone.age < zone.nextTick) continue;
      zone.nextTick += GARLIC_TICK;
      this.queryGarlicRadius(input.targets, zone);
    }
  }

  private spawnGarlicZone(
    position: Readonly<Vec3>,
    damage: number,
    slowAmount: number,
    slowDuration: number,
  ): void {
    const zone = this.garlicZones[this.garlicCursor]!;
    this.garlicCursor = (this.garlicCursor + 1) % this.garlicZones.length;
    zone.active = true;
    zone.age = 0;
    zone.lifetime = GARLIC_LIFETIME;
    zone.nextTick = 0;
    zone.radius = GARLIC_RADIUS;
    zone.damage = damage;
    zone.slowAmount = slowAmount;
    zone.slowDuration = slowDuration;
    copyPosition(zone.position, position);
    pushCapped(
      this.events,
      {
        type: 'garlic-zone-spawned',
        position: zone.position,
        radius: zone.radius,
      },
      EVENT_CAP_PER_STEP,
    );
  }

  private updateOrbitingBalls(input: Readonly<SecondaryWeaponStepInput>, dt: number): void {
    const count = Math.floor(safeFinite(input.modifiers.orbitingBallCount, 0, ORBIT_CAP, 0));
    const damage = safeFinite(input.modifiers.orbitingBallDamage, 0, 48, 0);
    for (let index = 0; index < this.orbitingBalls.length; index += 1) {
      const orbit = this.orbitingBalls[index]!;
      orbit.active = index < count && damage > 0;
      if (!orbit.active) {
        orbit.hitTimes.clear();
        continue;
      }
      const angle = this.elapsed * 2.65 + (index / Math.max(1, count)) * Math.PI * 2;
      orbit.position.x = input.playerPosition.x + Math.cos(angle) * ORBIT_RADIUS;
      orbit.position.y = input.playerPosition.y + 0.18 + Math.sin(this.elapsed * 4.4 + index) * 0.12;
      orbit.position.z = input.playerPosition.z + Math.sin(angle) * ORBIT_RADIUS;
      for (const [targetId, cooldown] of orbit.hitTimes) {
        const remaining = cooldown - dt;
        if (remaining <= 0) orbit.hitTimes.delete(targetId);
        else orbit.hitTimes.set(targetId, remaining);
      }
      for (const target of input.targets) {
        if (orbit.hitTimes.has(target.id)) continue;
        if (!overlaps(orbit.position, orbit.radius, target)) continue;
        this.pushHit(target, damage, 'spectral-ball', orbit.position);
        orbit.hitTimes.set(target.id, ORBIT_HIT_COOLDOWN);
        trimMap(orbit.hitTimes, 128);
        this.queueChainLightning(
          target.id,
          orbit.position,
          safeFinite(input.modifiers.orbitChainDamage, 0, 80, 0),
          Math.floor(safeFinite(input.modifiers.orbitChainTargets, 0, CHAIN_LIGHTNING_TARGET_CAP, 0)),
        );
        pushCapped(
          this.events,
          {
            type: 'spectral-ball-hit',
            position: orbit.position,
            targetId: target.id,
          },
          EVENT_CAP_PER_STEP,
        );
      }
    }
  }

  private updateBloodBombs(targets: readonly CombatTarget[]): void {
    for (const bomb of this.bloodBombs) {
      if (!bomb.active) continue;
      bomb.active = false;
      pushCapped(
        this.events,
        {
          type: 'blood-bomb-triggered',
          position: bomb.position,
          radius: bomb.radius,
        },
        EVENT_CAP_PER_STEP,
      );
      this.queryRadius(targets, bomb.position, bomb.radius, bomb.damage, 'blood-bomb');
    }
  }

  private updateGhostPasses(targets: readonly CombatTarget[], dt: number): void {
    for (const ghost of this.ghostPasses) {
      if (!ghost.active) continue;
      if (ghost.spawnEventCount > 0) {
        pushCapped(
          this.events,
          {
            type: 'ghost-pass-spawned',
            position: ghost.position,
            count: ghost.spawnEventCount,
          },
          EVENT_CAP_PER_STEP,
        );
        ghost.spawnEventCount = 0;
      }
      ghost.age += dt;
      if (ghost.age >= ghost.lifetime) {
        ghost.active = false;
        continue;
      }
      ghost.position.x += ghost.velocity.x * dt;
      ghost.position.y += ghost.velocity.y * dt;
      ghost.position.z += ghost.velocity.z * dt;
      for (const target of targets) {
        if (ghost.hitTargets.has(target.id)) continue;
        if (!overlaps(ghost.position, ghost.radius, target)) continue;
        this.pushHit(target, ghost.damage, 'ghost-pass', ghost.position);
        ghost.hitTargets.add(target.id);
        if (!ghost.voidTriggered) {
          ghost.voidTriggered = this.spawnBlackHole(
            ghost.position,
            ghost.voidDamage,
            ghost.voidRadius,
            ghost.voidPullStrength,
            ghost.voidDuration,
          );
        }
        pushCapped(
          this.events,
          {
            type: 'ghost-pass-hit',
            position: ghost.position,
            targetId: target.id,
          },
          EVENT_CAP_PER_STEP,
        );
      }
    }
  }

  private updateChainLightning(targets: readonly CombatTarget[]): void {
    const maximumDistanceSquared = CHAIN_LIGHTNING_RANGE * CHAIN_LIGHTNING_RANGE;
    for (const chain of this.chainLightningTriggers) {
      if (!chain.active) continue;
      chain.active = false;
      this.chainVisitedIds[0] = chain.originTargetId;
      let visitedCount = 1;
      let fromTargetId = chain.originTargetId;
      let currentPosition: Readonly<Vec3> = chain.originPosition;

      for (let jumpIndex = 0; jumpIndex < chain.targetCount; jumpIndex += 1) {
        let nearest: CombatTarget | null = null;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;
        for (const target of targets) {
          if (containsId(this.chainVisitedIds, visitedCount, target.id)) continue;
          const dx = target.position.x - currentPosition.x;
          const dz = target.position.z - currentPosition.z;
          const distanceSquared = dx * dx + dz * dz;
          if (distanceSquared > maximumDistanceSquared) continue;
          if (
            distanceSquared < nearestDistanceSquared ||
            (distanceSquared === nearestDistanceSquared &&
              target.id < (nearest?.id ?? Number.MAX_SAFE_INTEGER))
          ) {
            nearest = target;
            nearestDistanceSquared = distanceSquared;
          }
        }
        if (!nearest) break;

        this.chainVisitedIds[visitedCount] = nearest.id;
        visitedCount += 1;
        this.pushHit(nearest, chain.damage, 'chain-lightning', nearest.position);
        pushCapped(
          this.events,
          {
            type: 'chain-lightning-hit',
            position: nearest.position,
            fromTargetId,
            targetId: nearest.id,
            jumpIndex,
          },
          EVENT_CAP_PER_STEP,
        );
        fromTargetId = nearest.id;
        currentPosition = nearest.position;
      }
    }
  }

  private updateFrostBursts(targets: readonly CombatTarget[]): void {
    for (const burst of this.frostBurstTriggers) {
      if (!burst.active) continue;
      burst.active = false;
      pushCapped(
        this.events,
        { type: 'frost-burst-triggered', position: burst.position, radius: burst.radius },
        EVENT_CAP_PER_STEP,
      );

      const radiusSquared = burst.radius * burst.radius;
      let visitedCount = 0;
      while (visitedCount < FROST_BURST_TARGET_CAP) {
        let nearest: CombatTarget | null = null;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;
        for (const target of targets) {
          if (containsId(this.frostVisitedIds, visitedCount, target.id)) continue;
          const dx = target.position.x - burst.position.x;
          const dz = target.position.z - burst.position.z;
          const distanceSquared = dx * dx + dz * dz;
          if (distanceSquared > radiusSquared || Math.abs(target.position.y - burst.position.y) >= 1.7) {
            continue;
          }
          if (
            distanceSquared < nearestDistanceSquared ||
            (distanceSquared === nearestDistanceSquared &&
              target.id < (nearest?.id ?? Number.MAX_SAFE_INTEGER))
          ) {
            nearest = target;
            nearestDistanceSquared = distanceSquared;
          }
        }
        if (!nearest) break;

        this.frostVisitedIds[visitedCount] = nearest.id;
        visitedCount += 1;
        this.pushHit(nearest, burst.damage, 'frost-burst', nearest.position);
        pushCapped(
          this.events,
          {
            type: 'frost-burst-hit',
            position: nearest.position,
            targetId: nearest.id,
            speedMultiplier: burst.speedMultiplier,
            duration: burst.slowDuration,
          },
          EVENT_CAP_PER_STEP,
        );
      }
    }
  }

  private updateMultiBallShots(targets: readonly CombatTarget[], dt: number): void {
    for (const shot of this.multiBallShots) {
      if (!shot.active) continue;
      if (shot.spawnEventCount > 0) {
        pushCapped(
          this.events,
          { type: 'multi-ball-spawned', position: shot.position, count: shot.spawnEventCount },
          EVENT_CAP_PER_STEP,
        );
        shot.spawnEventCount = 0;
      }
      shot.age += dt;
      if (shot.age >= shot.lifetime) {
        shot.active = false;
        continue;
      }
      shot.position.x += shot.velocity.x * dt;
      shot.position.y += shot.velocity.y * dt;
      shot.position.z += shot.velocity.z * dt;
      for (const target of targets) {
        if (shot.hitTargets.has(target.id)) continue;
        if (!overlaps(shot.position, shot.radius, target)) continue;
        this.pushHit(target, shot.damage, 'multi-ball', shot.position);
        shot.hitTargets.add(target.id);
        pushCapped(
          this.events,
          {
            type: 'multi-ball-hit',
            position: shot.position,
            targetId: target.id,
            shotIndex: shot.shotIndex,
          },
          EVENT_CAP_PER_STEP,
        );
      }
    }
  }

  private updateBlackHoles(targets: readonly CombatTarget[], dt: number): void {
    for (const zone of this.blackHoleZones) {
      if (!zone.active) continue;
      if (zone.spawnEventPending) {
        pushCapped(
          this.events,
          {
            type: 'black-hole-spawned',
            position: zone.position,
            radius: zone.radius,
            duration: zone.lifetime,
          },
          EVENT_CAP_PER_STEP,
        );
        zone.spawnEventPending = false;
      }
      zone.age += dt;
      if (zone.age >= zone.lifetime) {
        zone.active = false;
        continue;
      }
      if (zone.age < zone.nextPulse) continue;
      zone.nextPulse += BLACK_HOLE_PULSE_INTERVAL;
      pushCapped(
        this.events,
        { type: 'black-hole-pulse', position: zone.position, radius: zone.radius },
        EVENT_CAP_PER_STEP,
      );

      const radiusSquared = zone.radius * zone.radius;
      let visitedCount = 0;
      while (visitedCount < BLACK_HOLE_TARGET_CAP) {
        let nearest: CombatTarget | null = null;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;
        for (const target of targets) {
          if (containsId(this.blackHoleVisitedIds, visitedCount, target.id)) continue;
          const dx = target.position.x - zone.position.x;
          const dz = target.position.z - zone.position.z;
          const distanceSquared = dx * dx + dz * dz;
          if (distanceSquared > radiusSquared || Math.abs(target.position.y - zone.position.y) >= 1.7) {
            continue;
          }
          if (
            distanceSquared < nearestDistanceSquared ||
            (distanceSquared === nearestDistanceSquared &&
              target.id < (nearest?.id ?? Number.MAX_SAFE_INTEGER))
          ) {
            nearest = target;
            nearestDistanceSquared = distanceSquared;
          }
        }
        if (!nearest) break;

        this.blackHoleVisitedIds[visitedCount] = nearest.id;
        visitedCount += 1;
        if (zone.damage > 0) this.pushHit(nearest, zone.damage, 'black-hole', nearest.position);
        if (zone.pullStrength <= 0) continue;
        const distance = Math.sqrt(nearestDistanceSquared);
        const scale = distance > 0.0001 ? zone.pullStrength / distance : 0;
        pushCapped(
          this.events,
          {
            type: 'black-hole-pull',
            position: nearest.position,
            targetId: nearest.id,
            force: {
              x: (zone.position.x - nearest.position.x) * scale,
              y: 0,
              z: (zone.position.z - nearest.position.z) * scale,
            },
          },
          EVENT_CAP_PER_STEP,
        );
      }
    }
  }

  private queryRadius(
    targets: readonly CombatTarget[],
    position: Readonly<Vec3>,
    radius: number,
    damage: number,
    source: SecondaryDamageHit['source'],
  ): void {
    for (const target of targets) {
      if (overlaps(position, radius, target)) this.pushHit(target, damage, source, position);
    }
  }

  private queryGarlicRadius(targets: readonly CombatTarget[], zone: GarlicZoneInternal): void {
    for (const target of targets) {
      if (!overlaps(zone.position, zone.radius, target)) continue;
      this.pushHit(target, zone.damage, 'garlic-trail', zone.position);
      if (zone.slowAmount <= 0 || zone.slowDuration <= 0) continue;
      pushCapped(
        this.events,
        {
          type: 'garlic-frost-hit',
          position: target.position,
          targetId: target.id,
          speedMultiplier: 1 - zone.slowAmount,
          duration: zone.slowDuration,
        },
        EVENT_CAP_PER_STEP,
      );
    }
  }

  private pushHit(
    target: CombatTarget,
    damage: number,
    source: SecondaryDamageHit['source'],
    position: Readonly<Vec3>,
  ): void {
    pushCapped(this.hits, { targetId: target.id, damage, source, position }, HIT_CAP_PER_STEP);
  }
}

function createGarlicZone(): GarlicZoneInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    radius: GARLIC_RADIUS,
    age: 0,
    lifetime: GARLIC_LIFETIME,
    nextTick: 0,
    damage: 0,
    slowAmount: 0,
    slowDuration: 0,
  };
}

function createOrbitingBall(): OrbitingBallInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    radius: ORBIT_BALL_RADIUS,
    hitTimes: new Map<number, number>(),
  };
}

function createBloodBomb(): BloodBombInternal {
  return { active: false, position: { x: 0, y: 0, z: 0 }, radius: 0, damage: 0 };
}

function createGhostPass(): GhostPassInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: GHOST_PASS_RADIUS,
    age: 0,
    lifetime: GHOST_PASS_LIFETIME,
    damage: 0,
    hitTargets: new Set<number>(),
    spawnEventCount: 0,
    voidTriggered: false,
    voidDamage: 0,
    voidRadius: 0,
    voidPullStrength: 0,
    voidDuration: 0,
  };
}

function createChainLightning(): ChainLightningInternal {
  return {
    active: false,
    originTargetId: 0,
    originPosition: { x: 0, y: 0, z: 0 },
    damage: 0,
    targetCount: 0,
  };
}

function createFrostBurst(): FrostBurstInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    radius: FROST_BURST_BASE_RADIUS,
    damage: 0,
    speedMultiplier: 1,
    slowDuration: 0,
  };
}

function createMultiBallShot(): MultiBallInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: MULTI_BALL_RADIUS,
    age: 0,
    lifetime: MULTI_BALL_LIFETIME,
    damage: 0,
    hitTargets: new Set<number>(),
    spawnEventCount: 0,
    shotIndex: 0,
  };
}

function createBlackHole(): BlackHoleInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    radius: BLACK_HOLE_BASE_RADIUS,
    age: 0,
    lifetime: 0,
    damage: 0,
    pullStrength: 0,
    nextPulse: 0,
    spawnEventPending: false,
  };
}

function overlaps(position: Readonly<Vec3>, radius: number, target: CombatTarget): boolean {
  const dx = position.x - target.position.x;
  const dz = position.z - target.position.z;
  const combined = radius + Math.max(0, target.radius);
  return dx * dx + dz * dz <= combined * combined && Math.abs(position.y - target.position.y) < 1.7;
}

function copyPosition(target: Vec3, source: Readonly<Vec3>): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}

function safeFinite(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function pushCapped<T>(items: T[], item: T, cap: number): void {
  if (items.length < cap) items.push(item);
}

function trimMap(map: Map<number, number>, cap: number): void {
  while (map.size > cap) {
    const first = map.keys().next().value as number | undefined;
    if (first === undefined) break;
    map.delete(first);
  }
}

function containsId(ids: Int32Array, count: number, id: number): boolean {
  for (let index = 0; index < count; index += 1) {
    if (ids[index] === id) return true;
  }
  return false;
}
