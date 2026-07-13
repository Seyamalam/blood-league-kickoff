import { describe, expect, it } from 'vitest';
import {
  chooseUpgrade,
  createProgressionState,
  createSeededRandom,
  createUpgradeOffer,
  getUpgradeAvailability,
  grantBloodXp,
  totalXpRequiredForLevel,
} from './index';

describe('progression', () => {
  it('queues every crossed level from a large XP grant', () => {
    const initial = createProgressionState();
    const result = grantBloodXp(initial, totalXpRequiredForLevel(5));
    expect(result.state.level).toBe(5);
    expect(result.state.pendingLevelUps).toBe(4);
    expect(initial.level).toBe(1);
  });

  it('applies upgrades without modifier drift', () => {
    let state = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(3)).state;
    const first = chooseUpgrade(state, 'powerKick');
    expect(first.applied).toBe(true);
    if (!first.applied) return;
    state = first.state;
    const second = chooseUpgrade(state, 'powerKick');
    expect(second.applied).toBe(true);
    if (!second.applied) return;
    expect(second.state.modifiers.kickPowerMultiplier).toBeCloseTo(1.32);
  });

  it('enforces prerequisites and produces deterministic offers', () => {
    const levelTwo = grantBloodXp(createProgressionState(), totalXpRequiredForLevel(2)).state;
    expect(getUpgradeAvailability(levelTwo, 'piercingStuds')).toEqual({ available: false, reason: 'prerequisite' });
    const offerA = createUpgradeOffer(levelTwo, createSeededRandom(42));
    const offerB = createUpgradeOffer(levelTwo, createSeededRandom(42));
    expect(offerA).toEqual(offerB);
    expect(new Set(offerA).size).toBe(offerA.length);
  });
});
