import type { CharacterId } from '../characters/types';

export const UPGRADE_IDS = [
  'silverBall',
  'powerKick',
  'rapidRecall',
  'piercingStuds',
  'garlicTrail',
  'orbitingSpectralBall',
  'bloodBomb',
  'ghostPass',
  'stormStuds',
  'frostCleats',
  'spectralVolley',
  'voidGoal',
  'ironHeart',
  'bloodMagnet',
  'killerInstinct',
  'bloodDrinker',
  'dashShockwave',
  'consecratedPitch',
  'ricochetBall',
  'bloodBarrier',
  'headerCannon',
  'cornerStorm',
  'redCard',
  'spectralTeammate',
  'penaltyMine',
  'bootCyclone',
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

export const EVOLUTION_IDS = [
  'moonBreaker',
  'crimsonMeteor',
  'graveFrostWake',
  'stormHalo',
  'phantomSingularity',
  'thunderclapRush',
  'sacredAegis',
  'royalHeader',
  'tempestSetPiece',
  'phantomFormation',
  'refereesReckoning',
] as const;

export type EvolutionId = (typeof EVOLUTION_IDS)[number];

export const CURSE_IDS = [
  'bloodMoonPact',
  'glassGoal',
  'hungryPitch',
  'suddenDeath',
  'offsideTrap',
  'cursedCrowd',
] as const;

export type CurseId = (typeof CURSE_IDS)[number];

export interface UpgradePrerequisite {
  upgradeId: UpgradeId;
  minStacks: number;
}

/** Additive values accumulated from all owned upgrade stacks. */
export interface ProgressionModifiers {
  ballDamageMultiplier: number;
  kickPowerMultiplier: number;
  ballSpeedMultiplier: number;
  knockbackMultiplier: number;
  recallSpeedMultiplier: number;
  recallCooldownMultiplier: number;
  pierceCount: number;
  garlicTrailDamage: number;
  orbitingBallCount: number;
  orbitingBallDamage: number;
  bloodBombDamage: number;
  bloodBombRadius: number;
  ghostPassCount: number;
  ghostPassDamageMultiplier: number;
  chainLightningDamage: number;
  chainLightningTargets: number;
  frostBurstDamage: number;
  frostBurstRadius: number;
  frostSlowAmount: number;
  frostSlowDuration: number;
  garlicSlowAmount: number;
  garlicSlowDuration: number;
  multiBallCount: number;
  multiBallDamageMultiplier: number;
  orbitChainDamage: number;
  orbitChainTargets: number;
  blackHoleDamage: number;
  blackHoleRadius: number;
  blackHolePullStrength: number;
  blackHoleDuration: number;
  ghostVoidDamage: number;
  ghostVoidRadius: number;
  ghostVoidPullStrength: number;
  ghostVoidDuration: number;
  maxHealthBonus: number;
  pickupRadiusMultiplier: number;
  allDamageMultiplier: number;
  lifeStealOnPrimaryKill: number;
  lifeStealOnSecondaryKill: number;
  bossLifeStealRatio: number;
  movementSpeedMultiplier: number;
  dashCooldownMultiplier: number;
  damageTakenMultiplier: number;
  curveStrengthMultiplier: number;
  volleyWindowBonus: number;
  eliteDamageMultiplier: number;
  secondaryDamageMultiplier: number;
  dashShockwaveDamage: number;
  dashShockwaveRadius: number;
  dashShockwaveKnockback: number;
  holyZoneDamage: number;
  holyZoneRadius: number;
  holyZoneDuration: number;
  ricochetDamage: number;
  ricochetTargets: number;
  ricochetRange: number;
  bloodBarrierCharges: number;
  bloodBarrierRechargeMultiplier: number;
  headerCannonDamage: number;
  headerCannonRadius: number;
  headerCannonKnockback: number;
  cornerStormDamage: number;
  cornerStormStrikes: number;
  cornerStormInterval: number;
  redCardDamage: number;
  redCardExecuteThreshold: number;
  redCardStunDuration: number;
  spectralTeammateCount: number;
  spectralTeammateDamage: number;
  spectralTeammateInterval: number;
  penaltyMineDamage: number;
  penaltyMineRadius: number;
  penaltyMineCount: number;
  bootCycloneDamage: number;
  bootCycloneRadius: number;
  bootCycloneInterval: number;
}

export type UpgradeModifierKey = keyof ProgressionModifiers;

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  kind: 'weapon' | 'passive';
  maxStacks: number;
  minPlayerLevel: number;
  prerequisites: readonly UpgradePrerequisite[];
  /** Values added once per stack. Multipliers use a baseline of 1. */
  modifierPerStack: Readonly<Partial<ProgressionModifiers>>;
}

export interface EvolutionDefinition {
  id: EvolutionId;
  name: string;
  description: string;
  requirements: readonly UpgradePrerequisite[];
  /** One-time additive modifier bonuses applied while this evolution is unlocked. */
  modifierBonus: Readonly<Partial<ProgressionModifiers>>;
}

export interface CurseDirectorModifiers {
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  spawnRateMultiplier: number;
  eliteChanceBonus: number;
  bossHealthMultiplier: number;
  rewardMultiplier: number;
}

export interface CurseDefinition {
  id: CurseId;
  name: string;
  description: string;
  benefit: string;
  drawback: string;
  benefitModifiers: Readonly<Partial<ProgressionModifiers>>;
  drawbackModifiers: Readonly<Partial<ProgressionModifiers>>;
  directorModifiers: Readonly<Partial<CurseDirectorModifiers>>;
}

export type UpgradeStacks = Record<UpgradeId, number>;
export type EvolutionUnlocks = Record<EvolutionId, boolean>;

export interface EvolutionUnlockEvent {
  type: 'evolution-unlocked';
  evolutionId: EvolutionId;
  definition: EvolutionDefinition;
}

export interface ProgressionState {
  /** Original football archetype selected for this run; null until selection. */
  characterId: CharacterId | null;
  /** Player level. A new run starts at level 1. */
  level: number;
  /** Lifetime blood XP collected during this run. */
  totalBloodXp: number;
  /** Level-ups earned but not yet resolved by choosing an upgrade. */
  pendingLevelUps: number;
  upgradeStacks: UpgradeStacks;
  evolutions: EvolutionUnlocks;
  /** Optional high-risk contracts selected before kickoff. */
  activeCurses: readonly CurseId[];
  /** Permanent character bonuses active for this run, such as mastery perks. */
  masteryModifierBonus: Readonly<Partial<ProgressionModifiers>>;
  modifiers: ProgressionModifiers;
}

export type RandomSource = () => number;

export type UpgradeAvailability =
  | { available: true }
  | {
      available: false;
      reason: 'max-stacks' | 'level' | 'prerequisite';
    };

export type UpgradeChoiceResult =
  | {
      applied: true;
      state: ProgressionState;
      definition: UpgradeDefinition;
      evolutionEvents: readonly EvolutionUnlockEvent[];
    }
  | {
      applied: false;
      state: ProgressionState;
      reason: 'no-pending-level-up' | 'max-stacks' | 'level' | 'prerequisite';
      evolutionEvents: readonly EvolutionUnlockEvent[];
    };

export interface BloodXpResult {
  state: ProgressionState;
  levelsGained: number;
}
