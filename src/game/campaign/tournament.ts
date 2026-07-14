export const TOURNAMENT_TEAM_IDS = [
  'huntrix',
  'nightwings',
  'iron-coven',
  'velvet-fangs',
  'graveyard-united',
  'red-spectres',
  'dusk-city',
  'moonward-fc',
] as const;

export type TournamentTeamId = (typeof TOURNAMENT_TEAM_IDS)[number];
export type TournamentRound = 'quarterfinal' | 'semifinal' | 'final';
export type TournamentMatchId = 'qf-1' | 'qf-2' | 'qf-3' | 'qf-4' | 'sf-1' | 'sf-2' | 'final';
export type TournamentStadiumId =
  'blood-court' | 'moonlit-classic' | 'emerald-cathedral' | 'royal-amethyst' | 'frostbound-arena';

export interface TournamentTeam {
  readonly id: TournamentTeamId;
  readonly name: string;
  readonly seed: number;
  readonly identity: string;
}

export interface TournamentMatchDefinition {
  readonly id: TournamentMatchId;
  readonly round: TournamentRound;
  readonly label: string;
  readonly stadiumId: TournamentStadiumId;
  readonly difficultyTier: 1 | 2 | 3;
  readonly storyBeat: string;
  readonly initialTeams: readonly [TournamentTeamId, TournamentTeamId] | null;
  readonly advancesTo: Readonly<{ matchId: TournamentMatchId; slot: 0 | 1 }> | null;
}

export interface TournamentMatchState {
  readonly id: TournamentMatchId;
  readonly participants: readonly [TournamentTeamId | null, TournamentTeamId | null];
  readonly winnerId: TournamentTeamId | null;
}

export interface TournamentState {
  readonly tournamentId: 'blood-league-cup';
  readonly matches: Readonly<Record<TournamentMatchId, TournamentMatchState>>;
  readonly championId: TournamentTeamId | null;
}

export const TOURNAMENT_TEAMS: Readonly<Record<TournamentTeamId, TournamentTeam>> = Object.freeze({
  huntrix: team('huntrix', 'Huntrix', 1, 'Adaptive hunters who turn every kickoff into a counterattack.'),
  nightwings: team('nightwings', 'Nightwing Athletic', 8, 'Fast wing pressure and supernatural multiball.'),
  'iron-coven': team('iron-coven', 'Iron Coven FC', 4, 'Heavy defenders who punish lost possession.'),
  'velvet-fangs': team('velvet-fangs', 'Velvet Fangs', 5, 'Technical dribblers with lethal counters.'),
  'graveyard-united': team(
    'graveyard-united',
    'Graveyard United',
    3,
    'A deep bench that grows stronger after every defeat.',
  ),
  'red-spectres': team('red-spectres', 'Red Spectres', 6, 'Ghost runners who phase through crowded lanes.'),
  'dusk-city': team('dusk-city', 'Dusk City', 2, 'Disciplined pressing beneath an artificial sunset.'),
  'moonward-fc': team('moonward-fc', 'Moonward FC', 7, 'Set-piece specialists empowered by lunar cycles.'),
});

export const TOURNAMENT_MATCH_DEFINITIONS: Readonly<Record<TournamentMatchId, TournamentMatchDefinition>> =
  Object.freeze({
    'qf-1': match(
      'qf-1',
      'quarterfinal',
      'Opening Night',
      'blood-court',
      1,
      ['huntrix', 'nightwings'],
      {
        matchId: 'sf-1',
        slot: 0,
      },
      'Huntrix enters the Blood League under floodlights.',
    ),
    'qf-2': match(
      'qf-2',
      'quarterfinal',
      'The Iron Derby',
      'moonlit-classic',
      1,
      ['iron-coven', 'velvet-fangs'],
      {
        matchId: 'sf-1',
        slot: 1,
      },
      "Two old rivals expose the tournament's hidden rules.",
    ),
    'qf-3': match(
      'qf-3',
      'quarterfinal',
      'Restless Ground',
      'emerald-cathedral',
      1,
      ['graveyard-united', 'red-spectres'],
      {
        matchId: 'sf-2',
        slot: 0,
      },
      'The dead refuse to leave the pitch at full time.',
    ),
    'qf-4': match(
      'qf-4',
      'quarterfinal',
      'Moonfall',
      'royal-amethyst',
      1,
      ['dusk-city', 'moonward-fc'],
      {
        matchId: 'sf-2',
        slot: 1,
      },
      'A lunar eclipse reveals who controls the league.',
    ),
    'sf-1': match(
      'sf-1',
      'semifinal',
      'Crimson Semifinal',
      'emerald-cathedral',
      2,
      null,
      {
        matchId: 'final',
        slot: 0,
      },
      'The surviving clubs learn the cup feeds on every goal.',
    ),
    'sf-2': match(
      'sf-2',
      'semifinal',
      'Frozen Semifinal',
      'frostbound-arena',
      2,
      null,
      {
        matchId: 'final',
        slot: 1,
      },
      'The arena freezes as the Count takes control.',
    ),
    final: match(
      'final',
      'final',
      'Blood League Final',
      'blood-court',
      3,
      null,
      null,
      'Win the cup or join the Count forever.',
    ),
  });

const MATCH_IDS = Object.keys(TOURNAMENT_MATCH_DEFINITIONS) as TournamentMatchId[];

export function createTournamentState(): TournamentState {
  const matches = Object.fromEntries(
    MATCH_IDS.map((id) => {
      const initial = TOURNAMENT_MATCH_DEFINITIONS[id].initialTeams;
      return [id, freezeMatchState(id, initial ?? [null, null], null)];
    }),
  ) as Record<TournamentMatchId, TournamentMatchState>;
  return freezeTournament(matches, null);
}

export function isTournamentMatchReady(state: TournamentState, matchId: TournamentMatchId): boolean {
  const matchState = state.matches[matchId];
  return matchState.winnerId === null && matchState.participants.every((participant) => participant !== null);
}

/** Resolves a fixture and deterministically advances its winner through the bracket. */
export function resolveTournamentMatch(
  state: TournamentState,
  matchId: TournamentMatchId,
  winnerId: TournamentTeamId,
): TournamentState {
  const current = state.matches[matchId];
  if (current.winnerId !== null) {
    if (current.winnerId === winnerId) return state;
    throw new Error(`Tournament match ${matchId} has already been resolved.`);
  }
  if (!current.participants.includes(winnerId)) {
    throw new Error(`Team ${winnerId} is not eligible for tournament match ${matchId}.`);
  }
  if (!isTournamentMatchReady(state, matchId)) {
    throw new Error(`Tournament match ${matchId} is not ready.`);
  }

  const matches = cloneMatches(state.matches);
  matches[matchId] = freezeMatchState(matchId, current.participants, winnerId);
  const target = TOURNAMENT_MATCH_DEFINITIONS[matchId].advancesTo;
  if (!target) return freezeTournament(matches, winnerId);

  const destination = matches[target.matchId];
  if (destination.participants[target.slot] !== null) {
    throw new Error(`Tournament slot ${target.matchId}:${target.slot} is already occupied.`);
  }
  const participants: [TournamentTeamId | null, TournamentTeamId | null] = [...destination.participants];
  participants[target.slot] = winnerId;
  matches[target.matchId] = freezeMatchState(target.matchId, participants, null);
  return freezeTournament(matches, state.championId);
}

export function getReadyTournamentMatches(state: TournamentState): readonly TournamentMatchDefinition[] {
  return MATCH_IDS.filter((id) => isTournamentMatchReady(state, id)).map(
    (id) => TOURNAMENT_MATCH_DEFINITIONS[id],
  );
}

export function tournamentProgress(state: TournamentState): number {
  return MATCH_IDS.filter((id) => state.matches[id].winnerId !== null).length / MATCH_IDS.length;
}

function team(id: TournamentTeamId, name: string, seed: number, identity: string): TournamentTeam {
  return Object.freeze({ id, name, seed, identity });
}

function match(
  id: TournamentMatchId,
  round: TournamentRound,
  label: string,
  stadiumId: TournamentStadiumId,
  difficultyTier: 1 | 2 | 3,
  initialTeams: readonly [TournamentTeamId, TournamentTeamId] | null,
  advancesTo: Readonly<{ matchId: TournamentMatchId; slot: 0 | 1 }> | null,
  storyBeat: string,
): TournamentMatchDefinition {
  return Object.freeze({
    id,
    round,
    label,
    stadiumId,
    difficultyTier,
    initialTeams: initialTeams
      ? (Object.freeze([...initialTeams]) as readonly [TournamentTeamId, TournamentTeamId])
      : null,
    advancesTo: advancesTo ? Object.freeze({ ...advancesTo }) : null,
    storyBeat,
  });
}

function cloneMatches(
  source: Readonly<Record<TournamentMatchId, TournamentMatchState>>,
): Record<TournamentMatchId, TournamentMatchState> {
  return Object.fromEntries(MATCH_IDS.map((id) => [id, source[id]])) as Record<
    TournamentMatchId,
    TournamentMatchState
  >;
}

function freezeMatchState(
  id: TournamentMatchId,
  participants: readonly [TournamentTeamId | null, TournamentTeamId | null],
  winnerId: TournamentTeamId | null,
): TournamentMatchState {
  return Object.freeze({
    id,
    participants: Object.freeze([...participants]),
    winnerId,
  }) as TournamentMatchState;
}

function freezeTournament(
  matches: Record<TournamentMatchId, TournamentMatchState>,
  championId: TournamentTeamId | null,
): TournamentState {
  return Object.freeze({ tournamentId: 'blood-league-cup', matches: Object.freeze(matches), championId });
}
