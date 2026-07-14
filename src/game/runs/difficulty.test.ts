import { describe, expect, it } from 'vitest';
import { FULL_MATCH_CONFIG } from '../match';
import { createDifficultyRuleset, scaleMatchConfigForDifficulty, unlockedDifficultyIds } from './difficulty';

describe('difficulty rulesets', () => {
  it('combines difficulty and unique challenge modifiers', () => {
    const rules = createDifficultyRuleset('champion', ['bloodRush', 'noHealing', 'bloodRush']);
    expect(rules.modifierIds).toEqual(['bloodRush', 'noHealing']);
    expect(rules.enemySpeedMultiplier).toBeCloseTo(1.08 * 1.15);
    expect(rules.spawnRateMultiplier).toBeCloseTo(1.15 * 1.2);
    expect(rules.healingMultiplier).toBe(0);
    expect(rules.rewardMultiplier).toBeCloseTo(1.35 * 1.22 * 1.3);
  });

  it('gates upper tiers by account level', () => {
    expect(unlockedDifficultyIds(1)).toEqual(['rookie', 'professional']);
    expect(unlockedDifficultyIds(5)).toContain('champion');
    expect(unlockedDifficultyIds(9)).toContain('nightmare');
  });

  it('scales authored match deadlines for extra-time rules', () => {
    const rules = createDifficultyRuleset('professional', ['extraTime']);
    const scaled = scaleMatchConfigForDifficulty(FULL_MATCH_CONFIG, rules);
    expect(scaled.finalWave.deadlineMatchTime).toBe(FULL_MATCH_CONFIG.finalWave.deadlineMatchTime * 1.25);
    expect(scaled.halftimeChoiceDuration).toBe(FULL_MATCH_CONFIG.halftimeChoiceDuration);
  });
});
