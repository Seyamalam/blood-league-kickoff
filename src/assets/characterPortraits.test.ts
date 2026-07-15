import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '../profile';
import { CHARACTER_PORTRAIT_URLS } from './characterPortraits';

describe('character portraits', () => {
  it('ships one build-resolved portrait for every original character', () => {
    expect(Object.keys(CHARACTER_PORTRAIT_URLS).sort()).toEqual([...CHARACTER_IDS].sort());
    for (const url of Object.values(CHARACTER_PORTRAIT_URLS)) expect(url).toMatch(/\.png$/);
  });
});
