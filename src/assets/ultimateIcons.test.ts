import { describe, expect, it } from 'vitest';
import { CHARACTER_ULTIMATE_IDS } from '../game/combat/characterUltimateTypes';
import { CHARACTER_ULTIMATE_ICON_URLS } from './ultimateIcons';

describe('character ultimate icons', () => {
  it('maps every ultimate to a distinct SVG asset URL', () => {
    const mappedIds = Object.keys(CHARACTER_ULTIMATE_ICON_URLS);
    const urls = Object.values(CHARACTER_ULTIMATE_ICON_URLS);

    expect(mappedIds).toEqual(CHARACTER_ULTIMATE_IDS);
    expect(urls).toHaveLength(6);
    expect(new Set(urls).size).toBe(6);
    expect(urls.every((url) => /(?:\.svg|image\/svg\+xml)/.test(url))).toBe(true);
  });

  it('freezes the public map', () => {
    expect(Object.isFrozen(CHARACTER_ULTIMATE_ICON_URLS)).toBe(true);
  });
});
