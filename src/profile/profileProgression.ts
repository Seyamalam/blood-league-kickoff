import type {
  CharacterId,
  CharacterMastery,
  CompletedRun,
  LifetimeStatistics,
  PersonalBests,
  PlayerProfile,
} from './types';

/** Total account XP required to enter a level. */
export function totalAccountXpForLevel(level: number): number {
  const steps = Math.max(0, Math.floor(Number.isFinite(level) ? level : 1) - 1);
  return steps * 350 + steps * steps * 75;
}

export function accountLevelForXp(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1;
  while (safeXp >= totalAccountXpForLevel(level + 1)) level += 1;
  return level;
}

export function updateLifetime(
  lifetime: Readonly<LifetimeStatistics>,
  run: Readonly<CompletedRun>,
): LifetimeStatistics {
  return {
    matchesPlayed: lifetime.matchesPlayed + 1,
    wins: lifetime.wins + (run.outcome === 'victory' ? 1 : 0),
    defeats: lifetime.defeats + (run.outcome === 'defeat' ? 1 : 0),
    totalScore: lifetime.totalScore + integer(run.score),
    kills: lifetime.kills + integer(run.kills),
    goals: lifetime.goals + integer(run.goals),
    survivalSeconds: lifetime.survivalSeconds + finite(run.timeSeconds),
    evolutionsUnlocked: lifetime.evolutionsUnlocked + uniqueStrings(run.evolutionIds).length,
  };
}

export function updatePersonalBests(
  bests: Readonly<PersonalBests>,
  run: Readonly<CompletedRun>,
): PersonalBests {
  const time = finite(run.timeSeconds);
  return {
    score: Math.max(bests.score, integer(run.score)),
    kills: Math.max(bests.kills, integer(run.kills)),
    goals: Math.max(bests.goals, integer(run.goals)),
    highestLevel: Math.max(bests.highestLevel, Math.max(1, integer(run.level))),
    longestSurvivalSeconds: Math.max(bests.longestSurvivalSeconds, time),
    fastestVictorySeconds:
      run.outcome !== 'victory'
        ? bests.fastestVictorySeconds
        : bests.fastestVictorySeconds === null
          ? time
          : Math.min(bests.fastestVictorySeconds, time),
  };
}

export function updateMastery(
  mastery: Readonly<CharacterMastery>,
  run: Readonly<CompletedRun>,
  xpEarned: number,
): CharacterMastery {
  return {
    xp: mastery.xp + integer(xpEarned),
    matches: mastery.matches + 1,
    wins: mastery.wins + (run.outcome === 'victory' ? 1 : 0),
    bestScore: Math.max(mastery.bestScore, integer(run.score)),
  };
}

export function masteryFor(profile: Readonly<PlayerProfile>, characterId: CharacterId): CharacterMastery {
  return profile.characterMastery[characterId];
}

function finite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function integer(value: number): number {
  return Math.floor(finite(value));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}
