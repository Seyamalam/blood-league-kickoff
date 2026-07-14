import { describe, expect, it } from 'vitest';
import {
  TOURNAMENT_MATCH_DEFINITIONS,
  TOURNAMENT_TEAMS,
  createTournamentState,
  getReadyTournamentMatches,
  isTournamentMatchReady,
  resolveTournamentMatch,
  tournamentProgress,
} from './tournament';

describe('Blood League tournament', () => {
  it('starts with four playable quarterfinals and locked later rounds', () => {
    const state = createTournamentState();
    expect(getReadyTournamentMatches(state).map((match) => match.id)).toEqual([
      'qf-1',
      'qf-2',
      'qf-3',
      'qf-4',
    ]);
    expect(isTournamentMatchReady(state, 'sf-1')).toBe(false);
    expect(state.championId).toBeNull();
    expect(tournamentProgress(state)).toBe(0);
  });

  it('advances winners through a complete deterministic bracket', () => {
    let state = createTournamentState();
    state = resolveTournamentMatch(state, 'qf-1', 'huntrix');
    state = resolveTournamentMatch(state, 'qf-2', 'velvet-fangs');
    state = resolveTournamentMatch(state, 'qf-3', 'graveyard-united');
    state = resolveTournamentMatch(state, 'qf-4', 'moonward-fc');
    expect(state.matches['sf-1'].participants).toEqual(['huntrix', 'velvet-fangs']);
    expect(state.matches['sf-2'].participants).toEqual(['graveyard-united', 'moonward-fc']);

    state = resolveTournamentMatch(state, 'sf-1', 'huntrix');
    state = resolveTournamentMatch(state, 'sf-2', 'moonward-fc');
    expect(state.matches.final.participants).toEqual(['huntrix', 'moonward-fc']);
    state = resolveTournamentMatch(state, 'final', 'huntrix');

    expect(state.championId).toBe('huntrix');
    expect(tournamentProgress(state)).toBe(1);
    expect(getReadyTournamentMatches(state)).toEqual([]);
  });

  it('is idempotent for duplicate results and rejects impossible rewrites', () => {
    const initial = createTournamentState();
    const resolved = resolveTournamentMatch(initial, 'qf-1', 'huntrix');
    expect(resolveTournamentMatch(resolved, 'qf-1', 'huntrix')).toBe(resolved);
    expect(() => resolveTournamentMatch(resolved, 'qf-1', 'nightwings')).toThrow(/already/);
    expect(() => resolveTournamentMatch(initial, 'sf-1', 'huntrix')).toThrow(/eligible|ready/);
    expect(() => resolveTournamentMatch(initial, 'qf-1', 'iron-coven')).toThrow(/eligible/);
  });

  it('defines original identities, stadiums, story beats, and rising difficulty', () => {
    expect(Object.keys(TOURNAMENT_TEAMS)).toHaveLength(8);
    expect(Object.values(TOURNAMENT_TEAMS).every((team) => team.identity.length > 20)).toBe(true);
    expect(TOURNAMENT_MATCH_DEFINITIONS['qf-1'].difficultyTier).toBe(1);
    expect(TOURNAMENT_MATCH_DEFINITIONS['sf-1'].difficultyTier).toBe(2);
    expect(TOURNAMENT_MATCH_DEFINITIONS.final.difficultyTier).toBe(3);
    expect(TOURNAMENT_MATCH_DEFINITIONS.final.storyBeat).toContain('cup');
  });
});
