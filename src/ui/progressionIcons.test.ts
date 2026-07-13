import { describe, expect, it } from 'vitest';
import { EVOLUTION_IDS, UPGRADE_IDS } from '../game/progression';
import { EVOLUTION_ICON_URLS, UPGRADE_ICON_URLS } from './progressionIcons';

describe('progression icon assets', () => {
  it('covers every upgrade and evolution ID exactly', () => {
    expect(Object.keys(UPGRADE_ICON_URLS)).toEqual(UPGRADE_IDS);
    expect(Object.keys(EVOLUTION_ICON_URLS)).toEqual(EVOLUTION_IDS);
  });

  it('assigns one non-empty asset URL to each progression item', () => {
    const urls = [...Object.values(UPGRADE_ICON_URLS), ...Object.values(EVOLUTION_ICON_URLS)];

    expect(urls).toHaveLength(UPGRADE_IDS.length + EVOLUTION_IDS.length);
    expect(urls.every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
