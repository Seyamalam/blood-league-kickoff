export const UPGRADE_IDS = [
  'silverBall',
  'powerKick',
  'rapidRecall',
  'piercingStuds',
  'garlicTrail',
  'orbitingSpectralBall',
  'bloodBomb',
  'ghostPass',
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

export const EVOLUTION_IDS = ['moonBreaker', 'crimsonMeteor'] as const;

export type EvolutionId = (typeof EVOLUTION_IDS)[number];

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
}

export type UpgradeModifierKey = keyof ProgressionModifiers;

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
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

export type UpgradeStacks = Record<UpgradeId, number>;
export type EvolutionUnlocks = Record<EvolutionId, boolean>;

export interface EvolutionUnlockEvent {
  type: 'evolution-unlocked';
  evolutionId: EvolutionId;
  definition: EvolutionDefinition;
}

export interface ProgressionState {
  /** Player level. A new run starts at level 1. */
  level: number;
  /** Lifetime blood XP collected during this run. */
  totalBloodXp: number;
  /** Level-ups earned but not yet resolved by choosing an upgrade. */
  pendingLevelUps: number;
  upgradeStacks: UpgradeStacks;
  evolutions: EvolutionUnlocks;
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
