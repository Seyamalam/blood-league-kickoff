import {
  EVOLUTION_IDS,
  UPGRADE_IDS,
  type BloodXpResult,
  type EvolutionId,
  type EvolutionUnlockEvent,
  type EvolutionUnlocks,
  type ProgressionModifiers,
  type ProgressionState,
  type RandomSource,
  type UpgradeAvailability,
  type UpgradeChoiceResult,
  type UpgradeId,
  type UpgradeStacks,
} from './types';
import { EVOLUTION_DEFINITIONS } from './evolutionDefinitions';
import { UPGRADE_DEFINITIONS } from './upgradeDefinitions';
import { CHARACTER_DEFINITIONS, type CharacterId } from '../characters';

const BASE_MODIFIERS: Readonly<ProgressionModifiers> = Object.freeze({
  ballDamageMultiplier: 1,
  kickPowerMultiplier: 1,
  ballSpeedMultiplier: 1,
  knockbackMultiplier: 1,
  recallSpeedMultiplier: 1,
  recallCooldownMultiplier: 1,
  pierceCount: 0,
  garlicTrailDamage: 0,
  orbitingBallCount: 0,
  orbitingBallDamage: 0,
  bloodBombDamage: 0,
  bloodBombRadius: 0,
  ghostPassCount: 0,
  ghostPassDamageMultiplier: 1,
  chainLightningDamage: 0,
  chainLightningTargets: 0,
  frostBurstDamage: 0,
  frostBurstRadius: 0,
  frostSlowAmount: 0,
  frostSlowDuration: 0,
  garlicSlowAmount: 0,
  garlicSlowDuration: 0,
  multiBallCount: 0,
  multiBallDamageMultiplier: 0,
  orbitChainDamage: 0,
  orbitChainTargets: 0,
  blackHoleDamage: 0,
  blackHoleRadius: 0,
  blackHolePullStrength: 0,
  blackHoleDuration: 0,
  ghostVoidDamage: 0,
  ghostVoidRadius: 0,
  ghostVoidPullStrength: 0,
  ghostVoidDuration: 0,
  maxHealthBonus: 0,
  pickupRadiusMultiplier: 1,
  allDamageMultiplier: 1,
  lifeStealOnPrimaryKill: 0,
  lifeStealOnSecondaryKill: 0,
  bossLifeStealRatio: 0,
  movementSpeedMultiplier: 1,
  dashCooldownMultiplier: 1,
  damageTakenMultiplier: 1,
  curveStrengthMultiplier: 1,
  volleyWindowBonus: 0,
  eliteDamageMultiplier: 1,
  secondaryDamageMultiplier: 1,
  dashShockwaveDamage: 0,
  dashShockwaveRadius: 0,
  dashShockwaveKnockback: 0,
  holyZoneDamage: 0,
  holyZoneRadius: 0,
  holyZoneDuration: 0,
  ricochetDamage: 0,
  ricochetTargets: 0,
  ricochetRange: 0,
  bloodBarrierCharges: 0,
  bloodBarrierRechargeMultiplier: 1,
});

/** Total Blood XP preserved across the shard burst created by one enemy kill. */
export const BLOOD_XP_PER_KILL = 2;

/** Creates a fresh run progression state. */
export function createProgressionState(
  characterId: CharacterId | null = null,
  masteryModifierBonus: Readonly<Partial<ProgressionModifiers>> = {},
): ProgressionState {
  const upgradeStacks = createEmptyStacks();
  const evolutions = createEmptyEvolutions();
  return {
    characterId,
    level: 1,
    totalBloodXp: 0,
    pendingLevelUps: 0,
    upgradeStacks,
    evolutions,
    masteryModifierBonus: { ...masteryModifierBonus },
    modifiers: calculateModifiers(upgradeStacks, evolutions, characterId, masteryModifierBonus),
  };
}

/**
 * Total lifetime XP required to reach `level` (level 1 requires zero XP).
 * The curve is intentionally cheap early and grows smoothly for an 8–10 minute run.
 */
export function totalXpRequiredForLevel(level: number): number {
  const targetLevel = Math.max(1, Math.floor(level));
  if (targetLevel === 1) return 0;
  const steps = targetLevel - 1;
  return Math.floor(12 * steps + 5 * steps ** 1.55);
}

/** XP remaining from the given state until its next level. */
export function xpUntilNextLevel(state: Readonly<ProgressionState>): number {
  return Math.max(0, totalXpRequiredForLevel(state.level + 1) - state.totalBloodXp);
}

/** Adds blood XP and queues every crossed level, including large multi-level grants. */
export function grantBloodXp(state: Readonly<ProgressionState>, amount: number): BloodXpResult {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const totalBloodXp = state.totalBloodXp + safeAmount;
  let level = state.level;
  while (totalBloodXp >= totalXpRequiredForLevel(level + 1)) level += 1;
  const levelsGained = level - state.level;
  return {
    levelsGained,
    state: {
      ...cloneState(state),
      level,
      totalBloodXp,
      pendingLevelUps: state.pendingLevelUps + levelsGained,
    },
  };
}

/** Explains whether an upgrade may be offered/applied in the current state. */
export function getUpgradeAvailability(
  state: Readonly<ProgressionState>,
  upgradeId: UpgradeId,
): UpgradeAvailability {
  const definition = UPGRADE_DEFINITIONS[upgradeId];
  if (state.upgradeStacks[upgradeId] >= definition.maxStacks) {
    return { available: false, reason: 'max-stacks' };
  }
  if (state.level < definition.minPlayerLevel) {
    return { available: false, reason: 'level' };
  }
  const requirementsMet = definition.prerequisites.every(
    (requirement) => state.upgradeStacks[requirement.upgradeId] >= requirement.minStacks,
  );
  if (!requirementsMet) return { available: false, reason: 'prerequisite' };
  return { available: true };
}

/** Returns all currently valid upgrade IDs in stable definition order. */
export function getAvailableUpgradeIds(state: Readonly<ProgressionState>): UpgradeId[] {
  return UPGRADE_IDS.filter((upgradeId) => getUpgradeAvailability(state, upgradeId).available);
}

/**
 * Samples a no-duplicate upgrade offer. Inject a seeded RNG for replays/tests or
 * omit it for normal `Math.random()` offers. Returns fewer choices only when the
 * player has fewer than `count` valid upgrades remaining.
 */
export function createUpgradeOffer(
  state: Readonly<ProgressionState>,
  rng: RandomSource = Math.random,
  count = 3,
): UpgradeId[] {
  const pool = getAvailableUpgradeIds(state);
  const wanted = Math.min(Math.max(0, Math.floor(count)), pool.length);
  if (wanted === 0) return [];

  const result: UpgradeId[] = [];
  if (wanted >= 2) {
    const weapons = pool.filter((upgradeId) => UPGRADE_DEFINITIONS[upgradeId].kind === 'weapon');
    const passives = pool.filter((upgradeId) => UPGRADE_DEFINITIONS[upgradeId].kind === 'passive');
    if (weapons.length > 0 && passives.length > 0) {
      result.push(takeRandom(weapons, rng), takeRandom(passives, rng));
      removeSelected(pool, result);
    }
  }

  while (result.length < wanted && pool.length > 0) result.push(takeRandom(pool, rng));
  return result;
}

/**
 * Applies one offered upgrade and consumes one queued level-up. Invalid choices
 * return a reason without mutating or replacing the provided state.
 */
export function chooseUpgrade(state: Readonly<ProgressionState>, upgradeId: UpgradeId): UpgradeChoiceResult {
  if (state.pendingLevelUps <= 0) {
    return { applied: false, state: cloneState(state), reason: 'no-pending-level-up', evolutionEvents: [] };
  }
  const availability = getUpgradeAvailability(state, upgradeId);
  if (!availability.available) {
    return { applied: false, state: cloneState(state), reason: availability.reason, evolutionEvents: [] };
  }

  const upgradeStacks = { ...state.upgradeStacks };
  upgradeStacks[upgradeId] += 1;
  const evolutions = { ...state.evolutions };
  const evolutionEvents: EvolutionUnlockEvent[] = [];
  for (const evolutionId of getEligibleEvolutionIds({ ...state, upgradeStacks })) {
    if (evolutions[evolutionId]) continue;
    evolutions[evolutionId] = true;
    evolutionEvents.push({
      type: 'evolution-unlocked',
      evolutionId,
      definition: EVOLUTION_DEFINITIONS[evolutionId],
    });
  }
  const nextState: ProgressionState = {
    ...cloneState(state),
    pendingLevelUps: state.pendingLevelUps - 1,
    upgradeStacks,
    evolutions,
    modifiers: calculateModifiers(upgradeStacks, evolutions, state.characterId, state.masteryModifierBonus),
  };
  return {
    applied: true,
    state: nextState,
    definition: UPGRADE_DEFINITIONS[upgradeId],
    evolutionEvents,
  };
}

/** Returns locked evolutions whose upgrade requirements are currently met. */
export function getEligibleEvolutionIds(
  state: Pick<ProgressionState, 'upgradeStacks' | 'evolutions'>,
): EvolutionId[] {
  return EVOLUTION_IDS.filter((evolutionId) => {
    if (state.evolutions[evolutionId]) return false;
    return EVOLUTION_DEFINITIONS[evolutionId].requirements.every(
      (requirement) => state.upgradeStacks[requirement.upgradeId] >= requirement.minStacks,
    );
  });
}

export function getUnlockedEvolutionIds(state: Pick<ProgressionState, 'evolutions'>): EvolutionId[] {
  return EVOLUTION_IDS.filter((evolutionId) => state.evolutions[evolutionId]);
}

/** Rebuilds modifiers from stacks, preventing drift during resets or save loading. */
export function calculateModifiers(
  stacks: Readonly<UpgradeStacks>,
  evolutions?: Readonly<EvolutionUnlocks>,
  characterId: CharacterId | null = null,
  masteryModifierBonus: Readonly<Partial<ProgressionModifiers>> = {},
): ProgressionModifiers {
  const modifiers: ProgressionModifiers = { ...BASE_MODIFIERS };
  if (characterId) {
    applyModifierValues(modifiers, CHARACTER_DEFINITIONS[characterId].modifierBonus);
  }
  applyModifierValues(modifiers, masteryModifierBonus);
  for (const upgradeId of UPGRADE_IDS) {
    const definition = UPGRADE_DEFINITIONS[upgradeId];
    const stackCount = Math.min(definition.maxStacks, Math.max(0, Math.floor(stacks[upgradeId])));
    applyModifierValues(modifiers, definition.modifierPerStack, stackCount);
  }
  const activeEvolutions = evolutions ?? inferEvolutions(stacks);
  for (const evolutionId of EVOLUTION_IDS) {
    if (!activeEvolutions[evolutionId]) continue;
    applyModifierValues(modifiers, EVOLUTION_DEFINITIONS[evolutionId].modifierBonus);
  }
  // Cooldown can shrink but never reaches zero, even if definitions change later.
  modifiers.recallCooldownMultiplier = Math.max(0.25, modifiers.recallCooldownMultiplier);
  modifiers.pickupRadiusMultiplier = clampMultiplier(modifiers.pickupRadiusMultiplier, 0.5, 3);
  modifiers.allDamageMultiplier = clampMultiplier(modifiers.allDamageMultiplier, 0.25, 3);
  modifiers.movementSpeedMultiplier = clampMultiplier(modifiers.movementSpeedMultiplier, 0.5, 2);
  modifiers.dashCooldownMultiplier = clampMultiplier(modifiers.dashCooldownMultiplier, 0.4, 2);
  modifiers.damageTakenMultiplier = clampMultiplier(modifiers.damageTakenMultiplier, 0.25, 2);
  modifiers.curveStrengthMultiplier = clampMultiplier(modifiers.curveStrengthMultiplier, 0.5, 2);
  modifiers.eliteDamageMultiplier = clampMultiplier(modifiers.eliteDamageMultiplier, 0.5, 3);
  modifiers.secondaryDamageMultiplier = clampMultiplier(modifiers.secondaryDamageMultiplier, 0.25, 3);
  modifiers.maxHealthBonus = Math.max(-50, Math.min(200, modifiers.maxHealthBonus));
  modifiers.lifeStealOnPrimaryKill = Math.max(0, Math.min(10, modifiers.lifeStealOnPrimaryKill));
  modifiers.lifeStealOnSecondaryKill = Math.max(0, Math.min(5, modifiers.lifeStealOnSecondaryKill));
  modifiers.bossLifeStealRatio = Math.max(0, Math.min(0.05, modifiers.bossLifeStealRatio));
  modifiers.volleyWindowBonus = Math.max(0, Math.min(0.8, modifiers.volleyWindowBonus));
  modifiers.dashShockwaveDamage = Math.max(0, Math.min(80, modifiers.dashShockwaveDamage));
  modifiers.dashShockwaveRadius = Math.max(0, Math.min(3, modifiers.dashShockwaveRadius));
  modifiers.dashShockwaveKnockback = Math.max(0, Math.min(16, modifiers.dashShockwaveKnockback));
  modifiers.holyZoneDamage = Math.max(0, Math.min(32, modifiers.holyZoneDamage));
  modifiers.holyZoneRadius = Math.max(0, Math.min(2.5, modifiers.holyZoneRadius));
  modifiers.holyZoneDuration = Math.max(0, Math.min(8, modifiers.holyZoneDuration));
  modifiers.ricochetDamage = Math.max(0, Math.min(64, modifiers.ricochetDamage));
  modifiers.ricochetTargets = Math.floor(Math.max(0, Math.min(6, modifiers.ricochetTargets)));
  modifiers.ricochetRange = Math.max(0, Math.min(3, modifiers.ricochetRange));
  modifiers.bloodBarrierCharges = Math.floor(Math.max(0, Math.min(3, modifiers.bloodBarrierCharges)));
  modifiers.bloodBarrierRechargeMultiplier = clampMultiplier(
    modifiers.bloodBarrierRechargeMultiplier,
    0.35,
    2,
  );
  return modifiers;
}

/** Small deterministic RNG suitable for repeatable upgrade offers and tests. */
export function createSeededRandom(seed: number): RandomSource {
  let state = Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createEmptyStacks(): UpgradeStacks {
  return {
    silverBall: 0,
    powerKick: 0,
    rapidRecall: 0,
    piercingStuds: 0,
    garlicTrail: 0,
    orbitingSpectralBall: 0,
    bloodBomb: 0,
    ghostPass: 0,
    stormStuds: 0,
    frostCleats: 0,
    spectralVolley: 0,
    voidGoal: 0,
    ironHeart: 0,
    bloodMagnet: 0,
    killerInstinct: 0,
    bloodDrinker: 0,
    dashShockwave: 0,
    consecratedPitch: 0,
    ricochetBall: 0,
    bloodBarrier: 0,
  };
}

function createEmptyEvolutions(): EvolutionUnlocks {
  return {
    moonBreaker: false,
    crimsonMeteor: false,
    graveFrostWake: false,
    stormHalo: false,
    phantomSingularity: false,
    thunderclapRush: false,
    sacredAegis: false,
  };
}

function inferEvolutions(stacks: Readonly<UpgradeStacks>): EvolutionUnlocks {
  const evolutions = createEmptyEvolutions();
  for (const evolutionId of EVOLUTION_IDS) {
    evolutions[evolutionId] = EVOLUTION_DEFINITIONS[evolutionId].requirements.every(
      (requirement) => stacks[requirement.upgradeId] >= requirement.minStacks,
    );
  }
  return evolutions;
}

function cloneState(state: Readonly<ProgressionState>): ProgressionState {
  return {
    ...state,
    upgradeStacks: { ...state.upgradeStacks },
    evolutions: { ...state.evolutions },
    masteryModifierBonus: { ...state.masteryModifierBonus },
    modifiers: { ...state.modifiers },
  };
}

function normalizeRandom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

function takeRandom(pool: UpgradeId[], rng: RandomSource): UpgradeId {
  const index = Math.floor(normalizeRandom(rng()) * pool.length);
  const [selected] = pool.splice(index, 1);
  return selected!;
}

function removeSelected(pool: UpgradeId[], selected: readonly UpgradeId[]): void {
  for (const upgradeId of selected) {
    const index = pool.indexOf(upgradeId);
    if (index >= 0) pool.splice(index, 1);
  }
}

function applyModifierValues(
  target: ProgressionModifiers,
  values: Readonly<Partial<ProgressionModifiers>>,
  scale = 1,
): void {
  for (const [key, value] of Object.entries(values)) {
    const modifierKey = key as keyof ProgressionModifiers;
    target[modifierKey] += (value ?? 0) * scale;
  }
}

function clampMultiplier(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
