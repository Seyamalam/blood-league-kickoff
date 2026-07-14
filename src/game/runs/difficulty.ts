export const DIFFICULTY_IDS = ['rookie', 'professional', 'champion', 'nightmare'] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export const CHALLENGE_MODIFIER_IDS = [
  'extraTime',
  'noHealing',
  'eliteLeague',
  'oneTouch',
  'bloodRush',
] as const;
export type ChallengeModifierId = (typeof CHALLENGE_MODIFIER_IDS)[number];

export interface DifficultyDefinition {
  id: DifficultyId;
  name: string;
  description: string;
  unlockAccountLevel: number;
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  spawnRateMultiplier: number;
  rewardMultiplier: number;
}

export interface ChallengeModifierDefinition {
  id: ChallengeModifierId;
  name: string;
  description: string;
  rewardMultiplier: number;
  enemyHealthMultiplier?: number;
  enemySpeedMultiplier?: number;
  spawnRateMultiplier?: number;
  healingMultiplier?: number;
  playerDamageMultiplier?: number;
  matchDurationMultiplier?: number;
  eliteChanceBonus?: number;
}

export const DIFFICULTY_DEFINITIONS: Readonly<Record<DifficultyId, DifficultyDefinition>> = Object.freeze({
  rookie: defineDifficulty(
    'rookie',
    'Rookie',
    'A forgiving kickoff for learning builds.',
    1,
    0.82,
    0.92,
    0.8,
    0.88,
    0.85,
  ),
  professional: defineDifficulty(
    'professional',
    'Professional',
    'The intended Blood League challenge.',
    1,
    1,
    1,
    1,
    1,
    1,
  ),
  champion: defineDifficulty(
    'champion',
    'Champion',
    'Faster waves and hardier elite defenders.',
    5,
    1.28,
    1.08,
    1.18,
    1.15,
    1.35,
  ),
  nightmare: defineDifficulty(
    'nightmare',
    'Nightmare',
    'The stadium fights back from the opening whistle.',
    9,
    1.6,
    1.16,
    1.42,
    1.3,
    1.75,
  ),
});

export const CHALLENGE_MODIFIER_DEFINITIONS: Readonly<
  Record<ChallengeModifierId, ChallengeModifierDefinition>
> = Object.freeze({
  extraTime: modifier('extraTime', 'Extra Time', 'The match lasts 25% longer.', 1.2, {
    matchDurationMultiplier: 1.25,
  }),
  noHealing: modifier('noHealing', 'Dry Veins', 'All healing is disabled.', 1.3, { healingMultiplier: 0 }),
  eliteLeague: modifier('eliteLeague', 'Elite League', 'Elite enemies enter far more often.', 1.25, {
    eliteChanceBonus: 0.14,
  }),
  oneTouch: modifier('oneTouch', 'One Touch', 'You deal more damage but enemies are tougher.', 1.18, {
    playerDamageMultiplier: 1.15,
    enemyHealthMultiplier: 1.3,
  }),
  bloodRush: modifier('bloodRush', 'Blood Rush', 'Both movement and wave pressure accelerate.', 1.22, {
    enemySpeedMultiplier: 1.15,
    spawnRateMultiplier: 1.2,
  }),
});

export interface DifficultyRuleset {
  difficultyId: DifficultyId;
  modifierIds: readonly ChallengeModifierId[];
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  spawnRateMultiplier: number;
  rewardMultiplier: number;
  healingMultiplier: number;
  playerDamageMultiplier: number;
  matchDurationMultiplier: number;
  eliteChanceBonus: number;
}

export function createDifficultyRuleset(
  difficultyId: DifficultyId,
  modifierIds: readonly ChallengeModifierId[] = [],
): DifficultyRuleset {
  const difficulty = DIFFICULTY_DEFINITIONS[difficultyId];
  const uniqueModifiers = [...new Set(modifierIds)].filter((id) => CHALLENGE_MODIFIER_IDS.includes(id));
  const result: DifficultyRuleset = {
    difficultyId,
    modifierIds: uniqueModifiers,
    enemyHealthMultiplier: difficulty.enemyHealthMultiplier,
    enemySpeedMultiplier: difficulty.enemySpeedMultiplier,
    enemyDamageMultiplier: difficulty.enemyDamageMultiplier,
    spawnRateMultiplier: difficulty.spawnRateMultiplier,
    rewardMultiplier: difficulty.rewardMultiplier,
    healingMultiplier: 1,
    playerDamageMultiplier: 1,
    matchDurationMultiplier: 1,
    eliteChanceBonus: 0,
  };
  for (const modifierId of uniqueModifiers) {
    const modifierDefinition = CHALLENGE_MODIFIER_DEFINITIONS[modifierId];
    result.enemyHealthMultiplier *= modifierDefinition.enemyHealthMultiplier ?? 1;
    result.enemySpeedMultiplier *= modifierDefinition.enemySpeedMultiplier ?? 1;
    result.spawnRateMultiplier *= modifierDefinition.spawnRateMultiplier ?? 1;
    result.rewardMultiplier *= modifierDefinition.rewardMultiplier;
    result.healingMultiplier *= modifierDefinition.healingMultiplier ?? 1;
    result.playerDamageMultiplier *= modifierDefinition.playerDamageMultiplier ?? 1;
    result.matchDurationMultiplier *= modifierDefinition.matchDurationMultiplier ?? 1;
    result.eliteChanceBonus += modifierDefinition.eliteChanceBonus ?? 0;
  }
  return Object.freeze(result);
}

export function unlockedDifficultyIds(accountLevel: number): DifficultyId[] {
  const level = Number.isFinite(accountLevel) ? Math.max(1, Math.floor(accountLevel)) : 1;
  return DIFFICULTY_IDS.filter((id) => DIFFICULTY_DEFINITIONS[id].unlockAccountLevel <= level);
}

export function scaleMatchConfigForDifficulty(
  config: Readonly<MatchDirectorConfig>,
  ruleset: Pick<DifficultyRuleset, 'matchDurationMultiplier'>,
): MatchDirectorConfig {
  const scale = Number.isFinite(ruleset.matchDurationMultiplier)
    ? Math.max(0.5, Math.min(2, ruleset.matchDurationMultiplier))
    : 1;
  const stage = (
    value: Readonly<{ minimumMatchTime: number; deadlineMatchTime: number; killTarget: number }>,
  ) => ({
    ...value,
    minimumMatchTime: value.minimumMatchTime * scale,
    deadlineMatchTime: value.deadlineMatchTime * scale,
  });
  return {
    ...config,
    id: `${config.id}@${scale.toFixed(2)}x`,
    opening: stage(config.opening),
    firstHalf: stage(config.firstHalf),
    goalOpportunityDuration: config.goalOpportunityDuration * scale,
    escalation: stage(config.escalation),
    halftimeChoiceDuration: config.halftimeChoiceDuration,
    bloodMoon: stage(config.bloodMoon),
    finalGoalDuration: config.finalGoalDuration * scale,
    finalWave: stage(config.finalWave),
  };
}

function defineDifficulty(
  id: DifficultyId,
  name: string,
  description: string,
  unlockAccountLevel: number,
  enemyHealthMultiplier: number,
  enemySpeedMultiplier: number,
  enemyDamageMultiplier: number,
  spawnRateMultiplier: number,
  rewardMultiplier: number,
): DifficultyDefinition {
  return Object.freeze({
    id,
    name,
    description,
    unlockAccountLevel,
    enemyHealthMultiplier,
    enemySpeedMultiplier,
    enemyDamageMultiplier,
    spawnRateMultiplier,
    rewardMultiplier,
  });
}

function modifier(
  id: ChallengeModifierId,
  name: string,
  description: string,
  rewardMultiplier: number,
  values: Omit<ChallengeModifierDefinition, 'id' | 'name' | 'description' | 'rewardMultiplier'>,
): ChallengeModifierDefinition {
  return Object.freeze({ id, name, description, rewardMultiplier, ...values });
}
import type { MatchDirectorConfig } from '../match';
