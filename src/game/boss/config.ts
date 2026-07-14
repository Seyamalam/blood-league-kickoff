import type { CountGoalkeeperConfig, FinalEliteConfig } from './types';
import { GOAL_HALF_WIDTH, OPPONENT_GOAL_LINE_Z, PLAYABLE_HALF_LENGTH, PLAYABLE_HALF_WIDTH } from '../field';

export const DEFAULT_COUNT_GOALKEEPER_CONFIG: CountGoalkeeperConfig = {
  maxHealth: 120,
  radius: 1.15,
  goalLineZ: OPPONENT_GOAL_LINE_Z + 2.7,
  goalHalfWidth: GOAL_HALF_WIDTH - 1.15,
  arenaHalfWidth: PLAYABLE_HALF_WIDTH,
  arenaHalfDepth: PLAYABLE_HALF_LENGTH,
  entranceDuration: 2.4,
  guardingSpeed: 5.2,
  bloodRushHealthRatio: 0.66,
  desperationHealthRatio: 0.3,
  chargeCooldown: 3.2,
  telegraphDuration: 0.7,
  chargeDuration: 1.15,
  recoverDuration: 0.65,
  chargeSpeed: 11.5,
  desperationSpeedMultiplier: 1.28,
  contactDamage: 24,
  contactCooldown: 0.8,
  hitInvulnerability: 0.1,
  secondaryHitInvulnerability: 0.08,
  ballDamageMultiplier: 1,
  secondaryDamageMultiplier: 0.4,
  eliteSummonInterval: 7.5,
};

export const DEFAULT_FINAL_ELITE_CONFIG: FinalEliteConfig = {
  maxHealth: 36,
  radius: 0.92,
  speed: 2.65,
  contactDamage: 20,
  contactCooldown: 0.85,
  hitInvulnerability: 0.08,
  arenaHalfWidth: PLAYABLE_HALF_WIDTH,
  arenaHalfDepth: PLAYABLE_HALF_LENGTH,
};
