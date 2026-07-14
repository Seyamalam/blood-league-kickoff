import { describe, expect, it } from 'vitest';
import { grantBloodXp } from './progression';
import { createSeededRandom } from './progression';
import { createProgressionState } from './progression';
import { UpgradeDraftSession, createDraftOffer, rarityForUpgrade } from './upgradeDraft';

describe('upgrade draft', () => {
  it('assigns authored rarity tiers', () => {
    expect(rarityForUpgrade('silverBall')).toBe('common');
    expect(rarityForUpgrade('piercingStuds')).toBe('rare');
    expect(rarityForUpgrade('headerCannon')).toBe('epic');
    expect(rarityForUpgrade('redCard')).toBe('legendary');
  });

  it('respects unlocks, banishes, and deterministic random sources', () => {
    const state = grantBloodXp(createProgressionState(), 10_000).state;
    const options = {
      count: 3,
      allowedUpgradeIds: ['silverBall', 'powerKick', 'rapidRecall', 'redCard'] as const,
      banishedUpgradeIds: ['powerKick'] as const,
    };
    const first = createDraftOffer(state, createSeededRandom(42), options);
    const second = createDraftOffer(state, createSeededRandom(42), options);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first).not.toContain('powerKick');
  });

  it('spends run-scoped reroll, banish, and skip resources safely', () => {
    const state = grantBloodXp(createProgressionState(), 10_000).state;
    const draft = new UpgradeDraftSession({
      choices: 3,
      startingResources: { rerolls: 1, banishes: 1, skips: 1 },
    });
    const initial = draft.roll(state, createSeededRandom(1));
    const rerolled = draft.reroll(state, createSeededRandom(2));
    expect(rerolled).not.toBeNull();
    expect(draft.reroll(state)).toBeNull();
    expect(draft.banish(rerolled![0]!, state, createSeededRandom(3))).not.toBeNull();
    expect(draft.state.banishedUpgradeIds).toContain(rerolled![0]);
    expect(draft.skip()).toBe(true);
    expect(draft.skip()).toBe(false);
    expect(draft.state.resources).toEqual({ rerolls: 0, banishes: 0, skips: 0 });
    expect(initial).toHaveLength(3);
  });
});
