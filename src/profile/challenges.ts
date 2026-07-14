import type { ChallengeId, ChallengeProgress, CompletedRun, PlayerProfile } from './types';

export type ChallengeMetric =
  'matches' | 'wins' | 'score' | 'kills' | 'goals' | 'survival' | 'runLevel' | 'runEvolutions';

export interface ChallengeDefinition {
  id: ChallengeId;
  name: string;
  metric: ChallengeMetric;
  target: number;
}

export const CHALLENGE_DEFINITIONS: Readonly<Record<ChallengeId, ChallengeDefinition>> = Object.freeze({
  firstMatch: define('firstMatch', 'First Kickoff', 'matches', 1),
  firstVictory: define('firstVictory', 'Break the Curse', 'wins', 1),
  scoreTenThousand: define('scoreTenThousand', 'Five Figures', 'score', 10_000),
  killTwentyFive: define('killTwentyFive', 'Opening Rush', 'kills', 25),
  killFiveHundred: define('killFiveHundred', 'Vampire Hunter', 'kills', 500),
  scoreFirstGoal: define('scoreFirstGoal', 'Back of the Net', 'goals', 1),
  scoreTenGoals: define('scoreTenGoals', 'Clinical', 'goals', 10),
  surviveFiveMinutes: define('surviveFiveMinutes', 'Still Standing', 'survival', 300),
  reachRunLevelFive: define('reachRunLevelFive', 'Building Momentum', 'runLevel', 5),
  unlockTwoEvolutions: define('unlockTwoEvolutions', 'Double Evolution', 'runEvolutions', 2),
});

export function evaluateChallenges(
  profile: Readonly<PlayerProfile>,
  run: Readonly<CompletedRun>,
): { progress: Record<ChallengeId, ChallengeProgress>; completed: ChallengeId[] } {
  const progress = structuredCloneProgress(profile.challengeProgress);
  const completed: ChallengeId[] = [];
  for (const definition of Object.values(CHALLENGE_DEFINITIONS)) {
    const current = progress[definition.id];
    const value = metricValue(definition.metric, profile, run);
    current.value = Math.max(current.value, value);
    if (current.completedAt === null && current.value >= definition.target) {
      current.completedAt = run.completedAt;
      completed.push(definition.id);
    }
  }
  return { progress, completed };
}

function metricValue(
  metric: ChallengeMetric,
  profile: Readonly<PlayerProfile>,
  run: Readonly<CompletedRun>,
): number {
  switch (metric) {
    case 'matches':
      return profile.lifetime.matchesPlayed;
    case 'wins':
      return profile.lifetime.wins;
    case 'score':
      return profile.personalBests.score;
    case 'kills':
      return profile.lifetime.kills;
    case 'goals':
      return profile.lifetime.goals;
    case 'survival':
      return profile.personalBests.longestSurvivalSeconds;
    case 'runLevel':
      return Math.max(1, integer(run.level));
    case 'runEvolutions':
      return new Set(run.evolutionIds).size;
  }
}

function structuredCloneProgress(
  progress: Readonly<Record<ChallengeId, ChallengeProgress>>,
): Record<ChallengeId, ChallengeProgress> {
  return Object.fromEntries(Object.entries(progress).map(([id, state]) => [id, { ...state }])) as Record<
    ChallengeId,
    ChallengeProgress
  >;
}

function define(
  id: ChallengeId,
  name: string,
  metric: ChallengeMetric,
  target: number,
): Readonly<ChallengeDefinition> {
  return Object.freeze({ id, name, metric, target });
}

function integer(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
