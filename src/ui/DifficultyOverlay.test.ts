import { describe, expect, it } from 'vitest';
import { createDifficultySelectionView } from './DifficultyOverlay';

describe('difficulty selection view', () => {
  it('shows locked tiers and the combined reward', () => {
    const view = createDifficultySelectionView(1, 'professional', ['extraTime']);
    expect(view.tiers.find((tier) => tier.id === 'nightmare')).toMatchObject({
      unlocked: false,
      unlockLevel: 9,
    });
    expect(view.rulesetName).toBe('PROFESSIONAL + 1 MODIFIER');
    expect(view.rewardLabel).toBe('120% CAREER REWARDS');
  });

  it('caps modifier selection at three while allowing deselection', () => {
    const selected = ['extraTime', 'noHealing', 'eliteLeague'] as const;
    const view = createDifficultySelectionView(9, 'nightmare', selected);
    expect(view.modifiers.find((modifier) => modifier.id === 'bloodRush')?.disabled).toBe(true);
    expect(view.modifiers.find((modifier) => modifier.id === 'extraTime')?.disabled).toBe(false);
  });
});
