import type { ChallengeId, ChallengeProgress, CompletedRun, PlayerProfile } from './types';

export type ChallengeMetric =
  | 'matches'
  | 'wins'
  | 'score'
  | 'kills'
  | 'goals'
  | 'survival'
  | 'runLevel'
  | 'runEvolutions'
  | 'dailyRuns'
  | 'weeklyRuns';

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
  completeDailyRun: define('completeDailyRun', 'Daily Bloodshed', 'dailyRuns', 1),
  completeWeeklyRun: define('completeWeeklyRun', 'Weekly Champion', 'weeklyRuns', 1),
  playTenMatches: define('playTenMatches', 'Regular Starter', 'matches', 10),
  winFiveMatches: define('winFiveMatches', 'Unbeaten Run', 'wins', 5),
  scoreFiftyThousand: define('scoreFiftyThousand', 'Scoreboard Terror', 'score', 50_000),
  killOneThousand: define('killOneThousand', 'Night Exterminator', 'kills', 1_000),
  reachRunLevelTen: define('reachRunLevelTen', 'Fully Awakened', 'runLevel', 10),
  unlockThreeEvolutions: define('unlockThreeEvolutions', 'Unholy Trinity', 'runEvolutions', 3),
  playTwentyFiveMatches: define('playTwentyFiveMatches', 'Club Veteran', 'matches', 25),
  winTenMatches: define('winTenMatches', 'Double Figures', 'wins', 10),
  scoreTwentyFiveGoals: define('scoreTwentyFiveGoals', 'Golden Boot', 'goals', 25),
  scoreQuarterMillion: define('scoreQuarterMillion', 'Terrace Legend', 'score', 250_000),
  killTwentyFiveHundred: define('killTwentyFiveHundred', 'Final Whistle', 'kills', 2_500),
  surviveTenMinutes: define('surviveTenMinutes', 'Beyond Regulation', 'survival', 600),
  reachRunLevelFifteen: define('reachRunLevelFifteen', 'Peak Form', 'runLevel', 15),
  unlockFourEvolutions: define('unlockFourEvolutions', 'Impossible Formation', 'runEvolutions', 4),
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
    case 'dailyRuns':
      return run.runMode === 'daily' ? 1 : 0;
    case 'weeklyRuns':
      return run.runMode === 'weekly' ? 1 : 0;
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
