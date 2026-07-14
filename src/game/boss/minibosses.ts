import { PLAYABLE_HALF_LENGTH, PLAYABLE_HALF_WIDTH } from '../field';
import type { EnemyFormationId } from '../encounters/formations';
import type { MatchStage } from '../match';
import type { BossDamageInput, BossVec3 } from './types';

export type MinibossKind = 'crimsonCaptain' | 'graveyardPlaymaker';
export type MinibossPhase = 'entrance' | 'combat' | 'enraged' | 'defeated';
export type MinibossAction = 'idle' | 'telegraph' | 'charge' | 'volley' | 'summon' | 'recover';

export interface MinibossConfig {
  readonly kind: MinibossKind;
  readonly name: string;
  readonly icon: string;
  readonly maxHealth: number;
  readonly radius: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly contactCooldown: number;
  readonly attackCooldown: number;
  readonly telegraphDuration: number;
  readonly attackDuration: number;
  readonly recoverDuration: number;
  readonly hitInvulnerability: number;
}

export interface MinibossEncounterDefinition {
  readonly kind: MinibossKind;
  readonly stage: MatchStage;
  readonly triggerTime: number;
  readonly announcement: string;
  readonly rewardShards: number;
}

export interface MinibossState {
  readonly id: number;
  readonly kind: MinibossKind;
  readonly phase: MinibossPhase;
  readonly action: MinibossAction;
  readonly position: BossVec3;
  readonly previousPosition: BossVec3;
  readonly velocity: BossVec3;
  readonly target: BossVec3;
  readonly health: number;
  readonly maxHealth: number;
  readonly actionTimer: number;
  readonly actionCooldown: number;
  readonly contactCooldown: number;
  readonly hitInvulnerability: number;
  /** Bit zero is 66% health; bit one is 33% health. */
  readonly summonMask: number;
}

export type MinibossEvent =
  | { readonly type: 'phaseChanged'; readonly from: MinibossPhase; readonly to: MinibossPhase }
  | { readonly type: 'attackTelegraphed'; readonly target: BossVec3; readonly duration: number }
  | { readonly type: 'chargeStarted'; readonly velocity: BossVec3 }
  | {
      readonly type: 'bloodVolley';
      readonly origin: BossVec3;
      readonly target: BossVec3;
      readonly projectileCount: number;
      readonly damage: number;
    }
  | {
      readonly type: 'summonFormation';
      readonly formationId: EnemyFormationId;
      readonly anchor: BossVec3;
    }
  | { readonly type: 'contactAttack'; readonly damage: number }
  | { readonly type: 'damaged'; readonly amount: number; readonly remainingHealth: number }
  | { readonly type: 'defeated' };

export interface MinibossUpdate {
  readonly state: MinibossState;
  readonly events: readonly MinibossEvent[];
}

export const MINIBOSS_CONFIGS: Readonly<Record<MinibossKind, MinibossConfig>> = Object.freeze({
  crimsonCaptain: Object.freeze({
    kind: 'crimsonCaptain',
    name: 'The Crimson Captain',
    icon: 'captain-armband',
    maxHealth: 54,
    radius: 1.05,
    speed: 4.1,
    contactDamage: 22,
    contactCooldown: 0.8,
    attackCooldown: 2.6,
    telegraphDuration: 0.65,
    attackDuration: 0.48,
    recoverDuration: 0.72,
    hitInvulnerability: 0.06,
  }),
  graveyardPlaymaker: Object.freeze({
    kind: 'graveyardPlaymaker',
    name: 'The Graveyard Playmaker',
    icon: 'skull-ball',
    maxHealth: 46,
    radius: 0.9,
    speed: 3.35,
    contactDamage: 17,
    contactCooldown: 0.72,
    attackCooldown: 2.15,
    telegraphDuration: 0.82,
    attackDuration: 0.18,
    recoverDuration: 0.58,
    hitInvulnerability: 0.05,
  }),
});

/** Authored placements put both minibosses before the final goalkeeper encounter. */
export const MINIBOSS_ENCOUNTER_SCHEDULE: readonly MinibossEncounterDefinition[] = Object.freeze([
  Object.freeze({
    kind: 'crimsonCaptain',
    stage: 'escalation',
    triggerTime: 205,
    announcement: 'THE CRIMSON CAPTAIN TAKES THE FIELD',
    rewardShards: 18,
  }),
  Object.freeze({
    kind: 'graveyardPlaymaker',
    stage: 'bloodMoon',
    triggerTime: 345,
    announcement: 'THE GRAVEYARD PLAYMAKER CALLS FOR THE BALL',
    rewardShards: 24,
  }),
]);

export function spawnMiniboss(
  kind: MinibossKind,
  id: number,
  position: BossVec3 = { x: 0, y: 1, z: -20 },
): MinibossState {
  const config = MINIBOSS_CONFIGS[kind];
  return {
    id,
    kind,
    phase: 'entrance',
    action: 'idle',
    position: { ...position },
    previousPosition: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    target: { ...position },
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    actionTimer: 0.9,
    actionCooldown: config.attackCooldown,
    contactCooldown: 0,
    hitInvulnerability: 0,
    summonMask: 0,
  };
}

export function updateMiniboss(state: MinibossState, playerPosition: BossVec3, dt: number): MinibossUpdate {
  validateDt(dt);
  if (state.phase === 'defeated' || dt === 0) return { state, events: [] };
  const config = MINIBOSS_CONFIGS[state.kind];
  const events: MinibossEvent[] = [];
  let phase = state.phase;
  let action = state.action;
  let actionTimer = Math.max(0, state.actionTimer - dt);
  let actionCooldown = Math.max(0, state.actionCooldown - dt);
  let contactCooldown = Math.max(0, state.contactCooldown - dt);
  const hitInvulnerability = Math.max(0, state.hitInvulnerability - dt);
  let summonMask = state.summonMask;
  let target = state.target;
  let velocity: BossVec3 = { x: 0, y: 0, z: 0 };

  if (phase === 'entrance' && actionTimer <= 0) {
    events.push({ type: 'phaseChanged', from: 'entrance', to: 'combat' });
    phase = 'combat';
    action = 'idle';
    actionTimer = 0;
  }
  if (phase === 'combat' && state.health <= state.maxHealth * 0.4) {
    events.push({ type: 'phaseChanged', from: 'combat', to: 'enraged' });
    phase = 'enraged';
    actionCooldown = Math.min(actionCooldown, 0.35);
  }

  const threshold =
    state.health <= state.maxHealth / 3 ? 2 : state.health <= (state.maxHealth * 2) / 3 ? 1 : 0;
  const thresholdBit = threshold === 1 ? 1 : threshold === 2 ? 2 : 0;
  if (phase !== 'entrance' && thresholdBit !== 0 && (summonMask & thresholdBit) === 0 && action === 'idle') {
    summonMask |= thresholdBit;
    action = 'summon';
    actionTimer = 0.55;
    const formationId: EnemyFormationId = state.kind === 'crimsonCaptain' ? 'lineBreakers' : 'midfieldSwarm';
    events.push({ type: 'summonFormation', formationId, anchor: { ...state.position } });
  }

  const dx = playerPosition.x - state.position.x;
  const dz = playerPosition.z - state.position.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  const direction = { x: dx / distance, z: dz / distance };
  if (phase !== 'entrance' && action === 'idle') {
    if (actionCooldown <= 0) {
      action = 'telegraph';
      actionTimer = config.telegraphDuration;
      target = { ...playerPosition };
      events.push({ type: 'attackTelegraphed', target, duration: actionTimer });
    } else {
      const preferredDistance = state.kind === 'graveyardPlaymaker' ? 7.5 : 1.4;
      const directionScale = distance < preferredDistance && state.kind === 'graveyardPlaymaker' ? -1 : 1;
      velocity = {
        x: direction.x * config.speed * directionScale,
        y: 0,
        z: direction.z * config.speed * directionScale,
      };
    }
  } else if (action === 'telegraph' && actionTimer <= 0) {
    if (state.kind === 'crimsonCaptain') {
      action = 'charge';
      actionTimer = config.attackDuration;
      const chargeDirection = normalizedDirection(state.position, target);
      velocity = { x: chargeDirection.x * 11.5, y: 0, z: chargeDirection.z * 11.5 };
      events.push({ type: 'chargeStarted', velocity });
    } else {
      action = 'volley';
      actionTimer = config.attackDuration;
      events.push({
        type: 'bloodVolley',
        origin: { ...state.position },
        target: { ...target },
        projectileCount: phase === 'enraged' ? 7 : 5,
        damage: 12,
      });
    }
  } else if (action === 'charge') {
    const chargeDirection = normalizedDirection(state.position, target);
    velocity = { x: chargeDirection.x * 11.5, y: 0, z: chargeDirection.z * 11.5 };
    if (actionTimer <= 0) {
      action = 'recover';
      actionTimer = config.recoverDuration;
      velocity = { x: 0, y: 0, z: 0 };
    }
  } else if ((action === 'volley' || action === 'summon') && actionTimer <= 0) {
    action = 'recover';
    actionTimer = config.recoverDuration;
  } else if (action === 'recover' && actionTimer <= 0) {
    action = 'idle';
    actionCooldown = config.attackCooldown * (phase === 'enraged' ? 0.68 : 1);
  }

  const position = {
    x: clamp(state.position.x + velocity.x * dt, -PLAYABLE_HALF_WIDTH, PLAYABLE_HALF_WIDTH),
    y: state.position.y,
    z: clamp(state.position.z + velocity.z * dt, -PLAYABLE_HALF_LENGTH, PLAYABLE_HALF_LENGTH),
  };
  if (contactCooldown <= 0 && distance <= config.radius + 0.58) {
    events.push({ type: 'contactAttack', damage: config.contactDamage });
    contactCooldown = config.contactCooldown;
  }

  return {
    state: {
      ...state,
      phase,
      action,
      previousPosition: state.position,
      position,
      velocity,
      target,
      actionTimer,
      actionCooldown,
      contactCooldown,
      hitInvulnerability,
      summonMask,
    },
    events,
  };
}

export function damageMiniboss(state: MinibossState, input: BossDamageInput): MinibossUpdate {
  if (!Number.isFinite(input.amount) || input.amount < 0)
    throw new Error('Miniboss damage must be finite and non-negative.');
  if (state.phase === 'defeated' || state.hitInvulnerability > 0 || input.amount === 0)
    return { state, events: [] };
  const config = MINIBOSS_CONFIGS[state.kind];
  const sourceMultiplier = input.source === 'ball' ? 1.25 : input.source === 'holy' ? 1.15 : 1;
  const amount = Math.min(state.health, input.amount * sourceMultiplier);
  const health = Math.max(0, state.health - amount);
  const events: MinibossEvent[] = [{ type: 'damaged', amount, remainingHealth: health }];
  if (health <= 0) events.push({ type: 'defeated' });
  return {
    state: {
      ...state,
      health,
      phase: health <= 0 ? 'defeated' : state.phase,
      action: health <= 0 ? 'idle' : state.action,
      velocity: health <= 0 ? { x: 0, y: 0, z: 0 } : state.velocity,
      hitInvulnerability: config.hitInvulnerability,
    },
    events,
  };
}

function normalizedDirection(from: BossVec3, to: BossVec3): { x: number; z: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  return { x: dx / length, z: dz / length };
}

function validateDt(dt: number): void {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.1)
    throw new Error('Miniboss dt must be between 0 and 0.1 seconds.');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
