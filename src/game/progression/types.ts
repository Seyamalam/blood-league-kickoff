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

export type UpgradeStacks = Record<UpgradeId, number>;

export interface ProgressionState {
  /** Player level. A new run starts at level 1. */
  level: number;
  /** Lifetime blood XP collected during this run. */
  totalBloodXp: number;
  /** Level-ups earned but not yet resolved by choosing an upgrade. */
  pendingLevelUps: number;
  upgradeStacks: UpgradeStacks;
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
  | { applied: true; state: ProgressionState; definition: UpgradeDefinition }
  | {
      applied: false;
      state: ProgressionState;
      reason: 'no-pending-level-up' | 'max-stacks' | 'level' | 'prerequisite';
    };

export interface BloodXpResult {
  state: ProgressionState;
  levelsGained: number;
}
