import { describe, expect, it } from 'vitest';
import { ENEMY_ARCHETYPE_DEFINITIONS } from '../game/simulation/enemyArchetypes';
import { RIVAL_TEAM_IDS } from '../game/match/rivalTeams';
import { MINIBOSS_CONFIGS } from '../game/boss';
import {
  ENEMY_PORTRAIT_URLS,
  FEATURED_BOSS_PORTRAIT_URLS,
  MINIBOSS_PORTRAIT_URLS,
  RIVAL_PORTRAIT_URLS,
} from './oppositionPortraits';

describe('opposition portraits', () => {
  it('ships one portrait for every ordinary enemy archetype', () => {
    expect(Object.keys(ENEMY_PORTRAIT_URLS).sort()).toEqual(Object.keys(ENEMY_ARCHETYPE_DEFINITIONS).sort());
    for (const portrait of Object.values(ENEMY_PORTRAIT_URLS)) expect(portrait).toMatch(/\.png$/);
  });

  it('ships one captain portrait for every original rival club', () => {
    expect(Object.keys(RIVAL_PORTRAIT_URLS).sort()).toEqual([...RIVAL_TEAM_IDS].sort());
  });

  it('ships authored portraits for named minibosses and both goalkeeper encounters', () => {
    expect(Object.keys(MINIBOSS_PORTRAIT_URLS).sort()).toEqual(Object.keys(MINIBOSS_CONFIGS).sort());
    expect(Object.keys(FEATURED_BOSS_PORTRAIT_URLS).sort()).toEqual(['countGoalkeeper', 'goalLineBlocker']);
  });
});
