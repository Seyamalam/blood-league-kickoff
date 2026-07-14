import type { CharacterId } from '../characters';
import type { Vec3 } from '../simulation/types';
import { CHARACTER_ULTIMATE_DEFINITIONS } from './characterUltimateDefinitions';
import type {
  CharacterUltimateEffects,
  CharacterUltimateEvent,
  CharacterUltimateHit,
  CharacterUltimateState,
  CharacterUltimateStepInput,
  CharacterUltimateStepResult,
  UltimateTarget,
} from './characterUltimateTypes';

const MAX_CHARGE = 100;
const MAX_HITS_PER_STEP = 64;
const MAX_EVENTS_PER_STEP = 72;
const REDLINE_RADIUS = 2.35;
const REDLINE_DAMAGE = 12;
const REDLINE_PULSE_INTERVAL = 0.42;
const ENGINE_RADIUS = 6;
const ENGINE_DAMAGE = 14;
const ENGINE_PULSE_INTERVAL = 1;

const BASE_EFFECTS: CharacterUltimateEffects = Object.freeze({
  movementSpeedMultiplier: 1,
  dashCooldownMultiplier: 1,
  ballDamageMultiplier: 1,
  eliteDamageMultiplier: 1,
  recallSpeedMultiplier: 1,
  volleyWindowBonus: 0,
  pickupRadiusMultiplier: 1,
  damageTakenMultiplier: 1,
  knockbackMultiplier: 1,
});

/**
 * Deterministic character-ultimate simulation. It emits combat and presentation
 * intent but never mutates enemies, player health, progression, or Three.js state.
 */
export class CharacterUltimateSystem {
  private readonly definition;
  private readonly hits: CharacterUltimateHit[] = [];
  private readonly events: CharacterUltimateEvent[] = [];
  private readonly effects: MutableEffects = { ...BASE_EFFECTS };
  private readonly stateValue: MutableState;
  private readonly result: MutableResult;
  private pulseElapsed = 0;

  constructor(characterId: CharacterId) {
    this.definition = CHARACTER_ULTIMATE_DEFINITIONS[characterId];
    this.stateValue = {
      characterId,
      ultimateId: this.definition.id,
      charge: 0,
      chargeRequired: this.definition.chargeRequired,
      activeRemaining: 0,
      activationCount: 0,
      ready: false,
    };
    this.result = {
      activated: false,
      hits: this.hits,
      events: this.events,
      effects: this.effects,
      healing: 0,
      state: this.stateValue,
    };
  }

  get state(): CharacterUltimateState {
    return this.stateValue;
  }

  gainCharge(amount: number): number {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    this.stateValue.charge = Math.min(MAX_CHARGE, this.stateValue.charge + safeAmount);
    this.stateValue.ready = this.stateValue.charge >= this.stateValue.chargeRequired;
    return this.stateValue.charge;
  }

  reset(initialCharge = 0): void {
    this.stateValue.charge = clamp(initialCharge, 0, MAX_CHARGE);
    this.stateValue.activeRemaining = 0;
    this.stateValue.activationCount = 0;
    this.stateValue.ready = this.stateValue.charge >= this.stateValue.chargeRequired;
    this.pulseElapsed = 0;
    this.hits.length = 0;
    this.events.length = 0;
  }

  step(input: Readonly<CharacterUltimateStepInput>): CharacterUltimateStepResult {
    this.hits.length = 0;
    this.events.length = 0;
    Object.assign(this.effects, BASE_EFFECTS);
    this.result.activated = false;
    this.result.healing = 0;

    const dt = clamp(input.dt, 0, 0.1);
    if (input.activate && this.stateValue.ready && this.stateValue.activeRemaining <= 0) {
      this.activate(input);
    }

    if (this.stateValue.activeRemaining > 0) {
      this.applyActiveEffects(input, dt);
      this.stateValue.activeRemaining = Math.max(0, this.stateValue.activeRemaining - dt);
      if (this.stateValue.activeRemaining <= 0) this.pulseElapsed = 0;
    }
    return this.result;
  }

  private activate(input: Readonly<CharacterUltimateStepInput>): void {
    this.stateValue.charge = 0;
    this.stateValue.ready = false;
    this.stateValue.activeRemaining = this.definition.duration;
    this.stateValue.activationCount += 1;
    this.pulseElapsed = 0;
    this.result.activated = true;
    this.pushEvent({
      type: 'ultimate-activated',
      ultimateId: this.definition.id,
      position: copyVec(input.playerPosition),
      duration: this.definition.duration,
    });

    switch (this.stateValue.characterId) {
      case 'maestro':
        this.activateMaestro(input);
        break;
      case 'tower':
        this.activateTower(input);
        break;
      case 'finisher':
        this.activateFinisher(input);
        break;
      case 'guardian':
        this.result.healing += 24;
        this.pushEvent({ type: 'clean-sheet-aegis', position: copyVec(input.playerPosition) });
        break;
      case 'breakaway':
      case 'engine':
        break;
    }
  }

  private applyActiveEffects(input: Readonly<CharacterUltimateStepInput>, dt: number): void {
    switch (this.stateValue.characterId) {
      case 'maestro':
        this.effects.recallSpeedMultiplier = 1.85;
        this.effects.volleyWindowBonus = 0.35;
        break;
      case 'breakaway':
        this.effects.movementSpeedMultiplier = 1.5;
        this.effects.dashCooldownMultiplier = 0.4;
        this.effects.ballDamageMultiplier = 1.2;
        this.stepPulse(dt, REDLINE_PULSE_INTERVAL, () =>
          this.radialPulse(
            input.playerPosition,
            input.targets,
            REDLINE_RADIUS,
            REDLINE_DAMAGE,
            'redline-pulse',
          ),
        );
        break;
      case 'tower':
        this.effects.damageTakenMultiplier = 0.5;
        this.effects.knockbackMultiplier = 1.75;
        break;
      case 'finisher':
        this.effects.ballDamageMultiplier = 1.35;
        this.effects.eliteDamageMultiplier = 2;
        break;
      case 'engine':
        this.effects.movementSpeedMultiplier = 1.25;
        this.effects.pickupRadiusMultiplier = 3;
        this.stepPulse(dt, ENGINE_PULSE_INTERVAL, () =>
          this.radialPulse(
            input.playerPosition,
            input.targets,
            ENGINE_RADIUS,
            ENGINE_DAMAGE,
            'full-pitch-pulse',
          ),
        );
        break;
      case 'guardian':
        this.effects.damageTakenMultiplier = 0.22;
        this.result.healing += 2.5 * dt;
        break;
    }
  }

  private activateMaestro(input: Readonly<CharacterUltimateStepInput>): void {
    const targets = sortedByDistance(input.targets, input.playerPosition).slice(0, 6);
    let from = copyVec(input.playerPosition);
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!;
      const to = copyVec(target.position);
      this.pushHit(target, 22, to);
      this.pushEvent({
        type: 'spectral-assist',
        targetId: target.id,
        from,
        to,
        passIndex: index,
      });
      from = to;
    }
  }

  private activateTower(input: Readonly<CharacterUltimateStepInput>): void {
    const direction = normalizedFacing(input.facingDirection);
    const range = 8.5;
    const minimumDot = Math.cos(0.72);
    this.pushEvent({ type: 'meteor-header', position: copyVec(input.playerPosition), range });
    for (const target of input.targets) {
      const dx = target.position.x - input.playerPosition.x;
      const dz = target.position.z - input.playerPosition.z;
      const distance = Math.hypot(dx, dz);
      if (distance > range + target.radius || distance < 0.0001) continue;
      const dot = (dx / distance) * direction.x + (dz / distance) * direction.z;
      if (dot < minimumDot) continue;
      this.pushHit(target, 72, target.position);
      this.pushEvent({
        type: 'ultimate-knockback',
        targetId: target.id,
        force: { x: (dx / distance) * 18, y: 0, z: (dz / distance) * 18 },
      });
    }
  }

  private activateFinisher(input: Readonly<CharacterUltimateStepInput>): void {
    const target = [...input.targets].sort((a, b) => {
      const threatDifference = threatRank(b.threat) - threatRank(a.threat);
      if (threatDifference !== 0) return threatDifference;
      const distanceDifference =
        distanceSquared(a.position, input.playerPosition) - distanceSquared(b.position, input.playerPosition);
      return distanceDifference !== 0 ? distanceDifference : a.id - b.id;
    })[0];
    if (!target) return;
    const damage = target.threat === 'boss' ? 180 : target.threat === 'elite' ? 150 : 90;
    this.pushHit(target, damage, target.position);
    this.pushEvent({ type: 'last-touch-strike', targetId: target.id, position: copyVec(target.position) });
  }

  private stepPulse(dt: number, interval: number, pulse: () => void): void {
    this.pulseElapsed += dt;
    if (this.pulseElapsed > dt && this.pulseElapsed < interval) return;
    if (this.pulseElapsed >= interval) this.pulseElapsed %= interval;
    pulse();
  }

  private radialPulse(
    position: Readonly<Vec3>,
    targets: readonly UltimateTarget[],
    radius: number,
    damage: number,
    eventType: 'redline-pulse' | 'full-pitch-pulse',
  ): void {
    this.pushEvent({ type: eventType, position: copyVec(position), radius });
    for (const target of targets) {
      const reach = radius + target.radius;
      if (distanceSquared(target.position, position) > reach * reach) continue;
      this.pushHit(target, damage, target.position);
    }
  }

  private pushHit(target: UltimateTarget, damage: number, position: Readonly<Vec3>): void {
    if (this.hits.length >= MAX_HITS_PER_STEP) return;
    this.hits.push({
      targetId: target.id,
      damage,
      source: this.definition.id,
      position: copyVec(position),
    });
  }

  private pushEvent(event: CharacterUltimateEvent): void {
    if (this.events.length < MAX_EVENTS_PER_STEP) this.events.push(event);
  }
}

interface MutableState extends CharacterUltimateState {
  charge: number;
  activeRemaining: number;
  activationCount: number;
  ready: boolean;
}

interface MutableEffects extends CharacterUltimateEffects {
  movementSpeedMultiplier: number;
  dashCooldownMultiplier: number;
  ballDamageMultiplier: number;
  eliteDamageMultiplier: number;
  recallSpeedMultiplier: number;
  volleyWindowBonus: number;
  pickupRadiusMultiplier: number;
  damageTakenMultiplier: number;
  knockbackMultiplier: number;
}

interface MutableResult extends CharacterUltimateStepResult {
  activated: boolean;
  healing: number;
}

function sortedByDistance(targets: readonly UltimateTarget[], origin: Readonly<Vec3>): UltimateTarget[] {
  return [...targets].sort((a, b) => {
    const difference = distanceSquared(a.position, origin) - distanceSquared(b.position, origin);
    return difference !== 0 ? difference : a.id - b.id;
  });
}

function threatRank(threat: UltimateTarget['threat']): number {
  return threat === 'boss' ? 2 : threat === 'elite' ? 1 : 0;
}

function distanceSquared(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function normalizedFacing(facing: Readonly<Vec3>): Vec3 {
  const length = Math.hypot(facing.x, facing.z);
  if (length < 0.0001 || !Number.isFinite(length)) return { x: 0, y: 0, z: -1 };
  return { x: facing.x / length, y: 0, z: facing.z / length };
}

function copyVec(value: Readonly<Vec3>): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}
