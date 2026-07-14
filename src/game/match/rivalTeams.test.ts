import { describe, expect, it } from 'vitest';
import { RIVAL_TEAM_DEFINITIONS, RIVAL_TEAM_IDS, selectRivalTeam } from './rivalTeams';

describe('rival vampire teams', () => {
  it('selects the same original rival for the same shareable seed', () => {
    expect(selectRivalTeam(42417)).toBe(selectRivalTeam(42417));
    expect(selectRivalTeam(0).id).toBe('nightwings');
    expect(selectRivalTeam(1).id).toBe('iron-coven');
    expect(selectRivalTeam(Number.NaN).id).toBe('nightwings');
  });

  it('keeps every tactical identity inside conservative gameplay bounds', () => {
    expect(new Set(RIVAL_TEAM_IDS).size).toBe(4);
    for (const id of RIVAL_TEAM_IDS) {
      const team = RIVAL_TEAM_DEFINITIONS[id];
      expect(team.name.length).toBeGreaterThan(3);
      expect(team.identity.length).toBeGreaterThan(12);
      expect(team.enemyHealthMultiplier).toBeGreaterThanOrEqual(0.9);
      expect(team.enemyHealthMultiplier).toBeLessThanOrEqual(1.15);
      expect(team.enemySpeedMultiplier).toBeGreaterThanOrEqual(0.9);
      expect(team.enemySpeedMultiplier).toBeLessThanOrEqual(1.15);
      expect(team.enemyDamageMultiplier).toBeGreaterThanOrEqual(0.9);
      expect(team.enemyDamageMultiplier).toBeLessThanOrEqual(1.15);
      expect(team.multiball.count).toBeLessThanOrEqual(3);
    }
  });
});
