export const CHARACTER_IDS = ['maestro', 'breakaway', 'tower', 'finisher', 'engine', 'guardian'] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];
export type RunOutcome = 'victory' | 'defeat';
export type RecordedRunMode = 'standard' | 'daily' | 'weekly' | 'custom';

export const CHALLENGE_IDS = [
  'firstMatch',
  'firstVictory',
  'scoreTenThousand',
  'killTwentyFive',
  'killFiveHundred',
  'scoreFirstGoal',
  'scoreTenGoals',
  'surviveFiveMinutes',
  'reachRunLevelFive',
  'unlockTwoEvolutions',
] as const;

export type ChallengeId = (typeof CHALLENGE_IDS)[number];

export interface CompletedRun {
  id: string;
  completedAt: string;
  buildVersion: string;
  characterId: CharacterId;
  outcome: RunOutcome;
  score: number;
  kills: number;
  goals: number;
  timeSeconds: number;
  level: number;
  upgradeIds: readonly string[];
  evolutionIds: readonly string[];
  /** Optional replay metadata. Older profile documents remain valid without it. */
  seed?: number;
  seedCode?: string;
  runMode?: RecordedRunMode;
  challengeKey?: string | null;
  rulesetVersion?: string;
}

export interface RunRecord extends CompletedRun {
  accountXpEarned: number;
  masteryXpEarned: number;
}

export interface CharacterMastery {
  xp: number;
  matches: number;
  wins: number;
  bestScore: number;
}

export interface ChallengeProgress {
  value: number;
  completedAt: string | null;
}

export interface LifetimeStatistics {
  matchesPlayed: number;
  wins: number;
  defeats: number;
  totalScore: number;
  kills: number;
  goals: number;
  survivalSeconds: number;
  evolutionsUnlocked: number;
}

export interface PersonalBests {
  score: number;
  kills: number;
  goals: number;
  highestLevel: number;
  longestSurvivalSeconds: number;
  fastestVictorySeconds: number | null;
}

export interface PlayerProfile {
  createdAt: string;
  updatedAt: string;
  accountXp: number;
  selectedCharacterId: CharacterId;
  unlockedCharacterIds: CharacterId[];
  characterMastery: Record<CharacterId, CharacterMastery>;
  challengeProgress: Record<ChallengeId, ChallengeProgress>;
  lifetime: LifetimeStatistics;
  personalBests: PersonalBests;
  recentRuns: RunRecord[];
  /** Longer-lived replay guard; history itself is intentionally capped at twenty runs. */
  processedRunIds: string[];
}

export interface ProfileDocumentV1 {
  version: 1;
  profile: PlayerProfile;
}

export interface RunSettlement {
  applied: boolean;
  profile: Readonly<PlayerProfile>;
  run: Readonly<RunRecord> | null;
  accountXpEarned: number;
  previousAccountLevel: number;
  accountLevel: number;
  newlyUnlockedCharacterIds: readonly CharacterId[];
  completedChallengeIds: readonly ChallengeId[];
  newlyUnlockedMasteryRewardIds: readonly string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
