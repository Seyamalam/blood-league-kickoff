import { describe, expect, it } from 'vitest';
import { CURSE_DEFINITIONS, CURSE_IDS } from '../game/progression';
import { getCurseCardPresentation } from './CurseOverlay';
import { CURSE_ICON_URLS } from './progressionIcons';

describe('curse card presentation', () => {
  it('provides authored icons, accessible risk copy, and reward labels for every curse', () => {
    for (const curseId of CURSE_IDS) {
      const curse = CURSE_DEFINITIONS[curseId];
      const card = getCurseCardPresentation(curseId);
      expect(card.iconUrl).toBe(CURSE_ICON_URLS[curseId]);
      expect(card.name).toBe(curse.name);
      expect(card.ariaLabel).toContain(`Benefit: ${curse.benefit}`);
      expect(card.ariaLabel).toContain(`Drawback: ${curse.drawback}`);
      expect(card.rewardLabel).toMatch(/^\+\d+% CAREER REWARDS$/);
      expect(card.selected).toBe(false);
      expect(card.disabled).toBe(false);
    }
  });

  it('disables unselected cards at the three-curse cap while preserving selected cards', () => {
    const selection = new Set(CURSE_IDS.slice(0, 3));
    expect(getCurseCardPresentation(CURSE_IDS[0], selection)).toMatchObject({
      selected: true,
      disabled: false,
    });
    expect(getCurseCardPresentation(CURSE_IDS[3], selection)).toMatchObject({
      selected: false,
      disabled: true,
    });
  });

  it('disables account-locked curse contracts', () => {
    expect(getCurseCardPresentation('bloodMoonPact', [], false)).toMatchObject({
      selected: false,
      disabled: true,
    });
  });
});
