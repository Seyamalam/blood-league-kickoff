import { describe, expect, it } from 'vitest';
import {
  EVOLUTION_DEFINITIONS,
  EVOLUTION_IDS,
  createProgressionState,
  UPGRADE_DEFINITIONS,
  UPGRADE_IDS,
} from '../game/progression';
import { getUpgradeCardPresentation } from './UpgradeOverlay';
import { UPGRADE_ICON_URLS } from './progressionIcons';

describe('upgrade card presentation', () => {
  it('gives every upgrade its authored icon and complete accessible copy', () => {
    const state = createProgressionState();

    for (const [index, upgradeId] of UPGRADE_IDS.entries()) {
      const definition = UPGRADE_DEFINITIONS[upgradeId];
      const card = getUpgradeCardPresentation(upgradeId, index, state);

      expect(card.iconUrl).toBe(UPGRADE_ICON_URLS[upgradeId]);
      expect(card.name).toBe(definition.name);
      expect(card.description).toBe(definition.description);
      expect(card.ariaLabel).toContain(`${index + 1}. ${definition.name}.`);
      expect(card.ariaLabel).toContain(definition.description);
      expect(card.ariaLabel).toContain(`Stack 0 to 1 of ${definition.maxStacks}.`);
    }
  });

  it('names the partner and result on every evolution component card', () => {
    const state = createProgressionState();
    for (const evolutionId of EVOLUTION_IDS) {
      const evolution = EVOLUTION_DEFINITIONS[evolutionId];
      for (const requirement of evolution.requirements) {
        const partner = evolution.requirements.find(
          (candidate) => candidate.upgradeId !== requirement.upgradeId,
        );
        expect(partner).toBeDefined();
        if (!partner) continue;
        const card = getUpgradeCardPresentation(requirement.upgradeId, 0, state);
        expect(card.evolutionHint).toContain(
          `EVOLVES WITH ${UPGRADE_DEFINITIONS[partner.upgradeId].name} → ${evolution.name}`,
        );
        expect(card.ariaLabel).toContain(card.evolutionHint);
      }
    }
  });

  it('caps the visible next stack at the upgrade maximum', () => {
    const state = createProgressionState();
    state.upgradeStacks.silverBall = UPGRADE_DEFINITIONS.silverBall.maxStacks;

    const card = getUpgradeCardPresentation('silverBall', 0, state);

    expect(card.stackLabel).toBe('STACK 5 → 5 / 5');
    expect(card.ariaLabel).toContain('Stack 5 to 5 of 5.');
  });
});
