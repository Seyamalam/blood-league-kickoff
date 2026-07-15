import { describe, expect, it } from 'vitest';
import { ENEMY_ARCHETYPE_DEFINITIONS } from '../game/simulation/enemyArchetypes';
import { ENEMY_PORTRAIT_URLS } from './oppositionPortraits';

describe('opposition portraits', () => {
  it('ships one portrait for every ordinary enemy archetype', () => {
    expect(Object.keys(ENEMY_PORTRAIT_URLS).sort()).toEqual(Object.keys(ENEMY_ARCHETYPE_DEFINITIONS).sort());
    for (const portrait of Object.values(ENEMY_PORTRAIT_URLS)) expect(portrait).toMatch(/\.png$/);
  });
});
