import type { Vec3 } from '../simulation/types';
import type { CombatTarget, SecondaryDamageHit } from './types';
import type {
  BloodBarrierResult,
  WeaponExpansionEvent,
  WeaponExpansionModifiers,
  WeaponExpansionStepInput,
  WeaponExpansionStepResult,
} from './weaponExpansionTypes';

const SHOCKWAVE_CAP = 4;
const SHOCKWAVE_TARGET_CAP = 24;
const SHOCKWAVE_BASE_RADIUS = 1.25;
const HOLY_ZONE_CAP = 3;
const HOLY_ZONE_TARGET_CAP = 20;
const HOLY_ZONE_BASE_RADIUS = 1.45;
const HOLY_ZONE_PULSE_INTERVAL = 0.45;
const RICOCHET_TRIGGER_CAP = 8;
const RICOCHET_TARGET_CAP = 6;
const RICOCHET_BASE_RANGE = 3.8;
const BARRIER_BASE_RECHARGE_SECONDS = 18;
const HIT_CAP_PER_STEP = 128;
const EVENT_CAP_PER_STEP = 128;

interface ShockwaveInternal {
  active: boolean;
  position: Vec3;
  damage: number;
  radius: number;
  knockback: number;
}

interface HolyZoneInternal {
  active: boolean;
  position: Vec3;
  damage: number;
  radius: number;
  age: number;
  lifetime: number;
  nextPulse: number;
  spawnEventPending: boolean;
}

interface RicochetInternal {
  active: boolean;
  originTargetId: number;
  originPosition: Vec3;
  damage: number;
  targetCount: number;
  range: number;
}

/**
 * Fixed-pool simulation for four optional weapon paths. It reports damage and
 * movement intent without owning enemy or player state.
 */
export class WeaponExpansionSystem {
  private readonly shockwaves = Array.from({ length: SHOCKWAVE_CAP }, createShockwave);
  private readonly holyZones = Array.from({ length: HOLY_ZONE_CAP }, createHolyZone);
  private readonly ricochets = Array.from({ length: RICOCHET_TRIGGER_CAP }, createRicochet);
  private readonly ricochetVisitedIds = new Int32Array(RICOCHET_TARGET_CAP + 1);
  private readonly hits: SecondaryDamageHit[] = [];
  private readonly events: WeaponExpansionEvent[] = [];
  private readonly result: MutableStepResult = {
    hits: this.hits,
    events: this.events,
    barrierCharges: 0,
    barrierMaxCharges: 0,
  };
  private readonly barrierResult: BloodBarrierResult = {
    absorbedDamage: 0,
    remainingDamage: 0,
    charges: 0,
    maxCharges: 0,
  };
  private shockwaveCursor = 0;
  private holyZoneCursor = 0;
  private ricochetCursor = 0;
  private barrierCharges = 0;
  private barrierMaxCharges = 0;
  private barrierRechargeElapsed = 0;

  reset(): void {
    this.hits.length = 0;
    this.events.length = 0;
    this.shockwaveCursor = 0;
    this.holyZoneCursor = 0;
    this.ricochetCursor = 0;
    this.barrierCharges = 0;
    this.barrierMaxCharges = 0;
    this.barrierRechargeElapsed = 0;
    for (const shockwave of this.shockwaves) shockwave.active = false;
    for (const zone of this.holyZones) zone.active = false;
    for (const ricochet of this.ricochets) ricochet.active = false;
  }

  step(input: Readonly<WeaponExpansionStepInput>): WeaponExpansionStepResult {
    this.hits.length = 0;
    this.events.length = 0;
    const dt = safeFinite(input.dt, 0, 0.1, 0);
    this.syncBarrier(input.modifiers, dt);
    this.updateShockwaves(input.targets);
    this.updateHolyZones(input.targets, dt);
    this.updateRicochets(input.targets);
    this.result.barrierCharges = this.barrierCharges;
    this.result.barrierMaxCharges = this.barrierMaxCharges;
    return this.result;
  }

  /** Queue after a dash starts. The next step emits damage and radial force. */
  triggerDashShockwave(position: Readonly<Vec3>, modifiers: WeaponExpansionModifiers): boolean {
    const damage = safeFinite(modifiers.dashShockwaveDamage, 0, 80, 0);
    if (damage <= 0) return false;
    const shockwave = this.shockwaves[this.shockwaveCursor]!;
    this.shockwaveCursor = (this.shockwaveCursor + 1) % this.shockwaves.length;
    shockwave.active = true;
    copyPosition(shockwave.position, position);
    shockwave.damage = damage;
    shockwave.radius = Math.min(
      4.25,
      SHOCKWAVE_BASE_RADIUS + safeFinite(modifiers.dashShockwaveRadius, 0, 3, 0),
    );
    shockwave.knockback = safeFinite(modifiers.dashShockwaveKnockback, 0, 16, 0);
    return true;
  }

  /** Plant a persistent fixed-pool penalty zone, usually after a goal or charged kick. */
  triggerHolyPenaltyZone(position: Readonly<Vec3>, modifiers: WeaponExpansionModifiers): boolean {
    const damage = safeFinite(modifiers.holyZoneDamage, 0, 32, 0);
    const duration = safeFinite(modifiers.holyZoneDuration, 0, 8, 0);
    if (damage <= 0 || duration <= 0) return false;
    const zone = this.holyZones[this.holyZoneCursor]!;
    this.holyZoneCursor = (this.holyZoneCursor + 1) % this.holyZones.length;
    zone.active = true;
    zone.age = 0;
    zone.nextPulse = 0;
    zone.spawnEventPending = true;
    zone.damage = damage;
    zone.lifetime = duration;
    zone.radius = Math.min(3.95, HOLY_ZONE_BASE_RADIUS + safeFinite(modifiers.holyZoneRadius, 0, 2.5, 0));
    copyPosition(zone.position, position);
    return true;
  }

  /** Queue a deterministic nearest-neighbour bank shot after a primary impact. */
  triggerRicochet(
    originTargetId: number,
    originPosition: Readonly<Vec3>,
    modifiers: WeaponExpansionModifiers,
  ): boolean {
    const damage = safeFinite(modifiers.ricochetDamage, 0, 64, 0);
    const targetCount = Math.floor(safeFinite(modifiers.ricochetTargets, 0, RICOCHET_TARGET_CAP, 0));
    if (!Number.isInteger(originTargetId) || damage <= 0 || targetCount <= 0) return false;
    const ricochet = this.ricochets[this.ricochetCursor]!;
    this.ricochetCursor = (this.ricochetCursor + 1) % this.ricochets.length;
    ricochet.active = true;
    ricochet.originTargetId = originTargetId;
    copyPosition(ricochet.originPosition, originPosition);
    ricochet.damage = damage;
    ricochet.targetCount = targetCount;
    ricochet.range = Math.min(6.8, RICOCHET_BASE_RANGE + safeFinite(modifiers.ricochetRange, 0, 3, 0));
    return true;
  }

  /**
   * Consume one ward charge to absorb a complete hit. Call step first whenever
   * modifier stacks may have changed so newly earned charges are synchronized.
   */
  absorbWithBloodBarrier(incomingDamage: number, modifiers: WeaponExpansionModifiers): BloodBarrierResult {
    this.syncBarrier(modifiers, 0);
    const damage = safeFinite(incomingDamage, 0, 10_000, 0);
    const absorbedDamage = damage > 0 && this.barrierCharges > 0 ? damage : 0;
    if (absorbedDamage > 0) {
      this.barrierCharges -= 1;
      this.barrierRechargeElapsed = 0;
      pushCapped(
        this.events,
        { type: 'blood-barrier-blocked', absorbedDamage, charges: this.barrierCharges },
        EVENT_CAP_PER_STEP,
      );
    }
    this.barrierResult.absorbedDamage = absorbedDamage;
    this.barrierResult.remainingDamage = damage - absorbedDamage;
    this.barrierResult.charges = this.barrierCharges;
    this.barrierResult.maxCharges = this.barrierMaxCharges;
    return this.barrierResult;
  }

  private updateShockwaves(targets: readonly CombatTarget[]): void {
    for (const shockwave of this.shockwaves) {
      if (!shockwave.active) continue;
      shockwave.active = false;
      pushCapped(
        this.events,
        { type: 'dash-shockwave', position: shockwave.position, radius: shockwave.radius },
        EVENT_CAP_PER_STEP,
      );
      let hitCount = 0;
      for (const target of targets) {
        if (hitCount >= SHOCKWAVE_TARGET_CAP) break;
        if (!overlaps(shockwave.position, shockwave.radius, target)) continue;
        this.pushHit(target, shockwave.damage, 'dash-shockwave', shockwave.position);
        hitCount += 1;
        if (shockwave.knockback <= 0) continue;
        const dx = target.position.x - shockwave.position.x;
        const dz = target.position.z - shockwave.position.z;
        const length = Math.hypot(dx, dz);
        const directionX = length > 0.0001 ? dx / length : target.id % 2 === 0 ? 1 : -1;
        const directionZ = length > 0.0001 ? dz / length : 0;
        pushCapped(
          this.events,
          {
            type: 'dash-shockwave-knockback',
            targetId: target.id,
            force: {
              x: directionX * shockwave.knockback,
              y: 0,
              z: directionZ * shockwave.knockback,
            },
          },
          EVENT_CAP_PER_STEP,
        );
      }
    }
  }

  private updateHolyZones(targets: readonly CombatTarget[], dt: number): void {
    for (const zone of this.holyZones) {
      if (!zone.active) continue;
      if (zone.spawnEventPending) {
        zone.spawnEventPending = false;
        pushCapped(
          this.events,
          {
            type: 'holy-zone-spawned',
            position: zone.position,
            radius: zone.radius,
            duration: zone.lifetime,
          },
          EVENT_CAP_PER_STEP,
        );
      }
      zone.age += dt;
      if (zone.age > zone.lifetime) {
        zone.active = false;
        continue;
      }
      if (zone.age < zone.nextPulse) continue;
      zone.nextPulse += HOLY_ZONE_PULSE_INTERVAL;
      pushCapped(
        this.events,
        { type: 'holy-zone-pulse', position: zone.position, radius: zone.radius },
        EVENT_CAP_PER_STEP,
      );
      let hitCount = 0;
      for (const target of targets) {
        if (hitCount >= HOLY_ZONE_TARGET_CAP) break;
        if (!overlaps(zone.position, zone.radius, target)) continue;
        this.pushHit(target, zone.damage, 'holy-penalty-zone', zone.position);
        hitCount += 1;
      }
    }
  }

  private updateRicochets(targets: readonly CombatTarget[]): void {
    for (const ricochet of this.ricochets) {
      if (!ricochet.active) continue;
      ricochet.active = false;
      let visitedCount = 1;
      this.ricochetVisitedIds[0] = ricochet.originTargetId;
      let fromTargetId = ricochet.originTargetId;
      let fromX = ricochet.originPosition.x;
      let fromY = ricochet.originPosition.y;
      let fromZ = ricochet.originPosition.z;
      for (let jumpIndex = 0; jumpIndex < ricochet.targetCount; jumpIndex += 1) {
        let selected: CombatTarget | null = null;
        let selectedDistanceSquared = ricochet.range * ricochet.range;
        for (const target of targets) {
          if (containsId(this.ricochetVisitedIds, visitedCount, target.id)) continue;
          const dx = target.position.x - fromX;
          const dy = target.position.y - fromY;
          const dz = target.position.z - fromZ;
          const distanceSquared = dx * dx + dy * dy + dz * dz;
          if (
            distanceSquared > selectedDistanceSquared ||
            (distanceSquared === selectedDistanceSquared && selected && target.id >= selected.id)
          ) {
            continue;
          }
          selected = target;
          selectedDistanceSquared = distanceSquared;
        }
        if (!selected) break;
        this.ricochetVisitedIds[visitedCount] = selected.id;
        visitedCount += 1;
        this.pushHit(selected, ricochet.damage, 'ricochet-ball', selected.position);
        pushCapped(
          this.events,
          {
            type: 'ricochet-hit',
            fromTargetId,
            targetId: selected.id,
            jumpIndex,
            position: selected.position,
          },
          EVENT_CAP_PER_STEP,
        );
        fromTargetId = selected.id;
        fromX = selected.position.x;
        fromY = selected.position.y;
        fromZ = selected.position.z;
      }
    }
  }

  private syncBarrier(modifiers: WeaponExpansionModifiers, dt: number): void {
    const nextMax = Math.floor(safeFinite(modifiers.bloodBarrierCharges, 0, 3, 0));
    if (nextMax !== this.barrierMaxCharges) {
      if (nextMax > this.barrierMaxCharges) {
        this.barrierCharges = Math.min(nextMax, this.barrierCharges + nextMax - this.barrierMaxCharges);
      } else {
        this.barrierCharges = Math.min(this.barrierCharges, nextMax);
      }
      this.barrierMaxCharges = nextMax;
      this.barrierRechargeElapsed = 0;
      pushCapped(
        this.events,
        {
          type: 'blood-barrier-changed',
          charges: this.barrierCharges,
          maxCharges: this.barrierMaxCharges,
        },
        EVENT_CAP_PER_STEP,
      );
    }
    if (this.barrierMaxCharges <= 0 || this.barrierCharges >= this.barrierMaxCharges) return;
    const rechargeMultiplier = safeFinite(modifiers.bloodBarrierRechargeMultiplier, 0.35, 2, 1);
    const rechargeSeconds = BARRIER_BASE_RECHARGE_SECONDS * rechargeMultiplier;
    this.barrierRechargeElapsed += dt;
    while (this.barrierCharges < this.barrierMaxCharges && this.barrierRechargeElapsed >= rechargeSeconds) {
      this.barrierRechargeElapsed -= rechargeSeconds;
      this.barrierCharges += 1;
      pushCapped(
        this.events,
        {
          type: 'blood-barrier-changed',
          charges: this.barrierCharges,
          maxCharges: this.barrierMaxCharges,
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

interface MutableStepResult extends WeaponExpansionStepResult {
  barrierCharges: number;
  barrierMaxCharges: number;
}

function createShockwave(): ShockwaveInternal {
  return { active: false, position: { x: 0, y: 0, z: 0 }, damage: 0, radius: 0, knockback: 0 };
}

function createHolyZone(): HolyZoneInternal {
  return {
    active: false,
    position: { x: 0, y: 0, z: 0 },
    damage: 0,
    radius: 0,
    age: 0,
    lifetime: 0,
    nextPulse: 0,
    spawnEventPending: false,
  };
}

function createRicochet(): RicochetInternal {
  return {
    active: false,
    originTargetId: 0,
    originPosition: { x: 0, y: 0, z: 0 },
    damage: 0,
    targetCount: 0,
    range: 0,
  };
}

function overlaps(position: Readonly<Vec3>, radius: number, target: CombatTarget): boolean {
  const dx = position.x - target.position.x;
  const dy = position.y - target.position.y;
  const dz = position.z - target.position.z;
  const combinedRadius = radius + Math.max(0, target.radius);
  return dx * dx + dy * dy + dz * dz <= combinedRadius * combinedRadius;
}

function containsId(ids: Int32Array, count: number, id: number): boolean {
  for (let index = 0; index < count; index += 1) if (ids[index] === id) return true;
  return false;
}

function copyPosition(target: Vec3, source: Readonly<Vec3>): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}

function safeFinite(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function pushCapped<T>(items: T[], item: T, cap: number): void {
  if (items.length < cap) items.push(item);
}
