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

/** Reserved target id used to route secondary hits without colliding with ordinary enemy ids. */
export const COUNT_GOALKEEPER_COMBAT_TARGET_ID = -1;

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
    secondaryHitInvulnerability: 0,
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
    secondaryHitInvulnerability: Math.max(0, state.secondaryHitInvulnerability - dt),
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
    next = updateDiveCycle(next, input.playerPosition, dt, config, events);
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
  if (!Number.isFinite(hit.amount) || hit.amount < 0)
    throw new Error('Boss damage must be finite and non-negative.');
  if (
    state.phase === 'entrance' ||
    state.phase === 'defeated' ||
    (hit.source === 'secondary' ? state.secondaryHitInvulnerability > 0 : state.hitInvulnerability > 0) ||
    hit.amount === 0
  ) {
    return { state, events: [], appliedDamage: 0 };
  }

  if (state.action === 'dive' && (hit.source === 'ball' || hit.source === 'secondary')) {
    const events: CountGoalkeeperEvent[] = [
      { type: 'shotParried', source: hit.source },
      { type: 'counterattackStarted', duration: config.counterattackDuration },
    ];
    return {
      state: {
        ...state,
        action: 'counterattack',
        actionElapsed: 0,
        velocity: ZERO,
        hitInvulnerability: config.hitInvulnerability,
        secondaryHitInvulnerability: config.secondaryHitInvulnerability,
      },
      events,
      appliedDamage: 0,
    };
  }

  const multiplier =
    hit.source === 'ball'
      ? config.ballDamageMultiplier
      : hit.source === 'secondary'
        ? config.secondaryDamageMultiplier
        : 1;
  const vulnerabilityMultiplier = state.action === 'vulnerable' ? config.vulnerabilityDamageMultiplier : 1;
  const appliedDamage = Math.min(state.health, hit.amount * multiplier * vulnerabilityMultiplier);
  const health = Math.max(0, state.health - appliedDamage);
  const events: CountGoalkeeperEvent[] = [
    { type: 'damaged', amount: appliedDamage, remainingHealth: health },
  ];
  let next: CountGoalkeeperState =
    hit.source === 'secondary'
      ? { ...state, health, secondaryHitInvulnerability: config.secondaryHitInvulnerability }
      : { ...state, health, hitInvulnerability: config.hitInvulnerability };

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

/** Entrance and defeated states stay outside generic combat-target queries. */
export function isCountGoalkeeperDamageable(state: CountGoalkeeperState): boolean {
  return state.phase !== 'entrance' && state.phase !== 'defeated';
}

export function didDefeatCountGoalkeeper(events: readonly CountGoalkeeperEvent[]): boolean {
  return events.some((event) => event.type === 'defeated');
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
      events.push({
        type: 'vulnerabilityOpened',
        duration: config.vulnerabilityDuration,
        damageMultiplier: config.vulnerabilityDamageMultiplier,
      });
      return { ...state, position, action: 'vulnerable', actionElapsed: 0, velocity: ZERO };
    }
    return { ...state, position };
  }
  if (state.action === 'vulnerable' && state.actionElapsed >= config.vulnerabilityDuration) {
    events.push({ type: 'vulnerabilityClosed' });
    return {
      ...state,
      action: 'idle',
      actionElapsed: 0,
      actionCooldown: config.chargeCooldown,
      velocity: ZERO,
    };
  }
  if (state.action === 'recover' && state.actionElapsed >= config.recoverDuration) {
    return {
      ...state,
      action: 'idle',
      actionElapsed: 0,
      actionCooldown: config.chargeCooldown,
      velocity: ZERO,
    };
  }
  return state;
}

function updateDiveCycle(
  state: CountGoalkeeperState,
  player: BossVec3,
  dt: number,
  config: CountGoalkeeperConfig,
  events: CountGoalkeeperEvent[],
): CountGoalkeeperState {
  if (state.action === 'idle' && state.actionCooldown <= 0) {
    const targetX = clamp(player.x, -config.goalHalfWidth, config.goalHalfWidth);
    events.push({ type: 'diveTelegraphed', targetX, duration: config.diveTelegraphDuration });
    return {
      ...state,
      action: 'diveTelegraph',
      actionElapsed: 0,
      chargeTarget: { x: targetX, y: state.position.y, z: config.goalLineZ },
      velocity: ZERO,
    };
  }
  if (state.action === 'diveTelegraph' && state.actionElapsed >= config.diveTelegraphDuration) {
    const direction = Math.sign(state.chargeTarget.x - state.position.x) || 1;
    const velocity = { x: direction * config.diveSpeed, y: 0, z: 0 };
    events.push({ type: 'diveStarted', velocity });
    return { ...state, action: 'dive', actionElapsed: 0, velocity };
  }
  if (state.action === 'dive') {
    const position = {
      x: clamp(state.position.x + state.velocity.x * dt, -config.goalHalfWidth, config.goalHalfWidth),
      y: state.position.y,
      z: config.goalLineZ,
    };
    if (state.actionElapsed >= config.diveDuration) {
      return { ...state, position, action: 'recover', actionElapsed: 0, velocity: ZERO };
    }
    return { ...state, position };
  }
  if (state.action === 'counterattack' && state.actionElapsed >= config.counterattackDuration) {
    events.push(
      { type: 'counterattackReleased', target: { ...player }, damage: config.counterattackDamage },
      {
        type: 'vulnerabilityOpened',
        duration: config.vulnerabilityDuration,
        damageMultiplier: config.vulnerabilityDamageMultiplier,
      },
    );
    return { ...state, action: 'vulnerable', actionElapsed: 0, velocity: ZERO };
  }
  if (state.action === 'vulnerable' && state.actionElapsed >= config.vulnerabilityDuration) {
    events.push({ type: 'vulnerabilityClosed' });
    return {
      ...state,
      action: 'idle',
      actionElapsed: 0,
      actionCooldown: config.diveCooldown,
      velocity: ZERO,
    };
  }
  if (state.action === 'recover' && state.actionElapsed >= config.recoverDuration) {
    return {
      ...state,
      action: 'idle',
      actionElapsed: 0,
      actionCooldown: config.diveCooldown,
      velocity: ZERO,
    };
  }
  if (state.action === 'idle') {
    const targetX = clamp(player.x, -config.goalHalfWidth, config.goalHalfWidth);
    const step = clamp(targetX - state.position.x, -config.guardingSpeed * dt, config.guardingSpeed * dt);
    return { ...state, position: { x: state.position.x + step, y: state.position.y, z: config.goalLineZ } };
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
    actionCooldown: phase === 'guarding' ? config.diveCooldown : config.chargeCooldown * 0.55,
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
  return Math.floor(seed) >>> 0 || 1;
}

function validateStep(dt: number): void {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.1)
    throw new Error('Boss dt must be between 0 and 0.1 seconds.');
}

function validateConfig(config: CountGoalkeeperConfig): void {
  if (
    config.maxHealth <= 0 ||
    config.radius <= 0 ||
    config.chargeSpeed <= 0 ||
    config.diveSpeed <= 0 ||
    config.vulnerabilityDamageMultiplier < 1
  )
    throw new Error('Invalid boss config.');
  if (config.desperationHealthRatio <= 0 || config.desperationHealthRatio >= config.bloodRushHealthRatio) {
    throw new Error('Boss health phase ratios must be ordered between zero and one.');
  }
  if (config.bloodRushHealthRatio >= 1) throw new Error('Blood Rush ratio must be below one.');
  if (
    !Number.isFinite(config.ballDamageMultiplier) ||
    config.ballDamageMultiplier < 0 ||
    !Number.isFinite(config.secondaryDamageMultiplier) ||
    config.secondaryDamageMultiplier < 0 ||
    !Number.isFinite(config.hitInvulnerability) ||
    config.hitInvulnerability < 0 ||
    !Number.isFinite(config.secondaryHitInvulnerability) ||
    config.secondaryHitInvulnerability < 0
  ) {
    throw new Error('Boss damage multipliers and cooldowns must be finite and non-negative.');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
