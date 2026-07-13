import { DEFAULT_COUNT_GOALKEEPER_CONFIG } from './config';
import type {
  BossDamageInput,
  BossDamageResult,
  BossVec3,
  CountGoalkeeperConfig,
  CountGoalkeeperEvent,
  CountGoalkeeperPhase,
  CountGoalkeeperState,
  CountGoalkeeperUpdate,
  CountGoalkeeperUpdateInput,
} from './types';

const ZERO: BossVec3 = { x: 0, y: 0, z: 0 };

export interface SpawnCountGoalkeeperOptions {
  readonly id?: number;
  readonly seed?: number;
  readonly position?: BossVec3;
}

export function spawnCountGoalkeeper(
  options: SpawnCountGoalkeeperOptions = {},
  config: CountGoalkeeperConfig = DEFAULT_COUNT_GOALKEEPER_CONFIG,
): CountGoalkeeperState {
  validateConfig(config);
  const position = options.position ?? { x: 0, y: 1.15, z: config.goalLineZ };
  return {
    id: options.id ?? 1,
    phase: 'entrance',
    action: 'idle',
    position: { ...position },
    previousPosition: { ...position },
    velocity: ZERO,
    chargeTarget: { ...position },
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    phaseElapsed: 0,
    actionElapsed: 0,
    actionCooldown: config.chargeCooldown,
    hitInvulnerability: 0,
    contactCooldown: 0,
    eliteSummonCooldown: config.eliteSummonInterval,
    rngState: normalizeSeed(options.seed ?? 0xc01dcafe),
  };
}

export function resetCountGoalkeeper(
  state: CountGoalkeeperState,
  options: SpawnCountGoalkeeperOptions = {},
  config: CountGoalkeeperConfig = DEFAULT_COUNT_GOALKEEPER_CONFIG,
): CountGoalkeeperState {
  return spawnCountGoalkeeper(
    { ...options, id: options.id ?? state.id, seed: options.seed ?? state.rngState },
    config,
  );
}

export function updateCountGoalkeeper(
  state: CountGoalkeeperState,
  input: CountGoalkeeperUpdateInput,
  config: CountGoalkeeperConfig = DEFAULT_COUNT_GOALKEEPER_CONFIG,
): CountGoalkeeperUpdate {
  validateStep(input.dt);
  validateConfig(config);
  if (state.phase === 'defeated' || input.dt === 0) return { state, events: [] };

  const dt = input.dt;
  const events: CountGoalkeeperEvent[] = [];
  let next: CountGoalkeeperState = {
    ...state,
    previousPosition: state.position,
    phaseElapsed: state.phaseElapsed + dt,
    actionElapsed: state.actionElapsed + dt,
    actionCooldown: Math.max(0, state.actionCooldown - dt),
    hitInvulnerability: Math.max(0, state.hitInvulnerability - dt),
    contactCooldown: Math.max(0, state.contactCooldown - dt),
    eliteSummonCooldown: Math.max(0, state.eliteSummonCooldown - dt),
  };

  if (next.phase === 'entrance') {
    if (next.phaseElapsed >= config.entranceDuration) {
      events.push({ type: 'phaseChanged', from: 'entrance', to: 'guarding' });
      next = enterPhase(next, 'guarding', config);
    }
    return { state: next, events };
  }

  if (next.phase === 'guarding') {
    const targetX = clamp(input.playerPosition.x, -config.goalHalfWidth, config.goalHalfWidth);
    const step = clamp(targetX - next.position.x, -config.guardingSpeed * dt, config.guardingSpeed * dt);
    next = { ...next, position: { x: next.position.x + step, y: next.position.y, z: config.goalLineZ } };
  } else {
    next = updateChargeCycle(next, input.playerPosition, dt, config, events);
  }

  if (next.phase === 'desperation' && next.eliteSummonCooldown <= 0) {
    const archetypeRoll = nextRandom(next.rngState);
    const sideRoll = nextRandom(archetypeRoll.state);
    events.push({
      type: 'summonElite',
      archetype: archetypeRoll.value < 0.55 ? 'winger' : 'defender',
      side: sideRoll.value < 0.5 ? -1 : 1,
    });
    next = { ...next, rngState: sideRoll.state, eliteSummonCooldown: config.eliteSummonInterval };
  }

  const playerRadius = input.playerRadius ?? 0.58;
  const dx = input.playerPosition.x - next.position.x;
  const dz = input.playerPosition.z - next.position.z;
  if (next.contactCooldown <= 0 && dx * dx + dz * dz <= (config.radius + playerRadius) ** 2) {
    events.push({ type: 'contactAttack', damage: config.contactDamage });
    next = { ...next, contactCooldown: config.contactCooldown };
  }

  return { state: next, events };
}

export function damageCountGoalkeeper(
  state: CountGoalkeeperState,
  hit: BossDamageInput,
  config: CountGoalkeeperConfig = DEFAULT_COUNT_GOALKEEPER_CONFIG,
): BossDamageResult {
  validateConfig(config);
  if (!Number.isFinite(hit.amount) || hit.amount < 0) throw new Error('Boss damage must be finite and non-negative.');
  if (state.phase === 'entrance' || state.phase === 'defeated' || state.hitInvulnerability > 0 || hit.amount === 0) {
    return { state, events: [], appliedDamage: 0 };
  }

  const multiplier = hit.source === 'ball' ? config.ballDamageMultiplier : 1;
  const appliedDamage = Math.min(state.health, hit.amount * multiplier);
  const health = Math.max(0, state.health - appliedDamage);
  const events: CountGoalkeeperEvent[] = [{ type: 'damaged', amount: appliedDamage, remainingHealth: health }];
  let next: CountGoalkeeperState = { ...state, health, hitInvulnerability: config.hitInvulnerability };

  if (health <= 0) {
    events.push({ type: 'phaseChanged', from: state.phase, to: 'defeated' }, { type: 'defeated' });
    next = { ...next, phase: 'defeated', phaseElapsed: 0, action: 'idle', velocity: ZERO };
  } else {
    const phase = phaseForHealth(health / state.maxHealth, config);
    if (phase !== state.phase) {
      events.push({ type: 'phaseChanged', from: state.phase, to: phase });
      next = enterPhase(next, phase, config);
    }
  }
  return { state: next, events, appliedDamage };
}

function updateChargeCycle(
  state: CountGoalkeeperState,
  player: BossVec3,
  dt: number,
  config: CountGoalkeeperConfig,
  events: CountGoalkeeperEvent[],
): CountGoalkeeperState {
  const speedScale = state.phase === 'desperation' ? config.desperationSpeedMultiplier : 1;
  if (state.action === 'idle' && state.actionCooldown <= 0) {
    const target = { x: player.x, y: state.position.y, z: player.z };
    events.push({ type: 'chargeTelegraphed', target, duration: config.telegraphDuration });
    return { ...state, action: 'telegraph', actionElapsed: 0, chargeTarget: target, velocity: ZERO };
  }
  if (state.action === 'telegraph' && state.actionElapsed >= config.telegraphDuration) {
    const velocity = velocityToward(state.position, state.chargeTarget, config.chargeSpeed * speedScale);
    events.push({ type: 'chargeStarted', velocity });
    return { ...state, action: 'charge', actionElapsed: 0, velocity };
  }
  if (state.action === 'charge') {
    const position = {
      x: clamp(state.position.x + state.velocity.x * dt, -config.arenaHalfWidth, config.arenaHalfWidth),
      y: state.position.y,
      z: clamp(state.position.z + state.velocity.z * dt, -config.arenaHalfDepth, config.arenaHalfDepth),
    };
    if (state.actionElapsed >= config.chargeDuration) {
      return { ...state, position, action: 'recover', actionElapsed: 0, velocity: ZERO };
    }
    return { ...state, position };
  }
  if (state.action === 'recover' && state.actionElapsed >= config.recoverDuration) {
    return { ...state, action: 'idle', actionElapsed: 0, actionCooldown: config.chargeCooldown, velocity: ZERO };
  }
  return state;
}

function velocityToward(from: BossVec3, to: BossVec3, speed: number): BossVec3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  return { x: (dx / length) * speed, y: 0, z: (dz / length) * speed };
}

function phaseForHealth(
  ratio: number,
  config: CountGoalkeeperConfig,
): Exclude<CountGoalkeeperPhase, 'entrance' | 'defeated'> {
  if (ratio <= config.desperationHealthRatio) return 'desperation';
  if (ratio <= config.bloodRushHealthRatio) return 'bloodRush';
  return 'guarding';
}

function enterPhase(
  state: CountGoalkeeperState,
  phase: Exclude<CountGoalkeeperPhase, 'entrance' | 'defeated'>,
  config: CountGoalkeeperConfig,
): CountGoalkeeperState {
  return {
    ...state,
    phase,
    phaseElapsed: 0,
    action: 'idle',
    actionElapsed: 0,
    actionCooldown: phase === 'guarding' ? config.chargeCooldown : config.chargeCooldown * 0.55,
    velocity: ZERO,
  };
}

function nextRandom(seed: number): { value: number; state: number } {
  let state = seed >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  state >>>= 0;
  return { value: state / 0x1_0000_0000, state: state || 1 };
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error('Boss RNG seed must be finite.');
  return (Math.floor(seed) >>> 0) || 1;
}

function validateStep(dt: number): void {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.1) throw new Error('Boss dt must be between 0 and 0.1 seconds.');
}

function validateConfig(config: CountGoalkeeperConfig): void {
  if (config.maxHealth <= 0 || config.radius <= 0 || config.chargeSpeed <= 0) throw new Error('Invalid boss config.');
  if (config.desperationHealthRatio <= 0 || config.desperationHealthRatio >= config.bloodRushHealthRatio) {
    throw new Error('Boss health phase ratios must be ordered between zero and one.');
  }
  if (config.bloodRushHealthRatio >= 1) throw new Error('Blood Rush ratio must be below one.');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
