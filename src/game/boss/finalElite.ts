import { DEFAULT_FINAL_ELITE_CONFIG } from './config';
import type { BossVec3, FinalEliteConfig, FinalEliteEvent, FinalEliteState, FinalEliteUpdate } from './types';

/** Stable, intentionally simple final-wave fallback if the boss is not integrated. */
export function spawnFinalElite(
  id = 1,
  position: BossVec3 = { x: 0, y: 1, z: -11.8 },
  config: FinalEliteConfig = DEFAULT_FINAL_ELITE_CONFIG,
): FinalEliteState {
  return {
    id,
    position: { ...position },
    previousPosition: { ...position },
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    contactCooldown: 0,
    hitInvulnerability: 0,
    defeated: false,
  };
}

export function resetFinalElite(
  state: FinalEliteState,
  config: FinalEliteConfig = DEFAULT_FINAL_ELITE_CONFIG,
): FinalEliteState {
  return spawnFinalElite(state.id, { x: 0, y: 1, z: -11.8 }, config);
}

export function updateFinalElite(
  state: FinalEliteState,
  playerPosition: BossVec3,
  dt: number,
  config: FinalEliteConfig = DEFAULT_FINAL_ELITE_CONFIG,
): FinalEliteUpdate {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.1)
    throw new Error('Final elite dt must be between 0 and 0.1 seconds.');
  if (state.defeated || dt === 0) return { state, events: [] };
  const dx = playerPosition.x - state.position.x;
  const dz = playerPosition.z - state.position.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  const position = {
    x: clamp(
      state.position.x + (dx / distance) * config.speed * dt,
      -config.arenaHalfWidth,
      config.arenaHalfWidth,
    ),
    y: state.position.y,
    z: clamp(
      state.position.z + (dz / distance) * config.speed * dt,
      -config.arenaHalfDepth,
      config.arenaHalfDepth,
    ),
  };
  let contactCooldown = Math.max(0, state.contactCooldown - dt);
  const hitInvulnerability = Math.max(0, state.hitInvulnerability - dt);
  const events: FinalEliteEvent[] = [];
  if (contactCooldown <= 0 && distance <= config.radius + 0.58) {
    events.push({ type: 'contactAttack', damage: config.contactDamage });
    contactCooldown = config.contactCooldown;
  }
  return {
    state: { ...state, previousPosition: state.position, position, contactCooldown, hitInvulnerability },
    events,
  };
}

export function damageFinalElite(
  state: FinalEliteState,
  amount: number,
  config: FinalEliteConfig = DEFAULT_FINAL_ELITE_CONFIG,
): FinalEliteUpdate {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error('Final elite damage must be finite and non-negative.');
  if (state.defeated || state.hitInvulnerability > 0 || amount === 0) return { state, events: [] };
  const applied = Math.min(state.health, amount);
  const health = state.health - applied;
  const events: FinalEliteEvent[] = [{ type: 'damaged', amount: applied, remainingHealth: health }];
  if (health <= 0) events.push({ type: 'defeated' });
  return {
    state: {
      ...state,
      health,
      defeated: health <= 0,
      hitInvulnerability: config.hitInvulnerability,
    },
    events,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
