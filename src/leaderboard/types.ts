import type { CharacterId, PlayerProfile, RecordedRunMode, RunRecord } from '../profile';

export type LocalLeaderboardCategory = 'score' | 'fastestVictory';

export interface LocalLeaderboardQuery {
  category: LocalLeaderboardCategory;
  buildVersion: string;
  characterId?: CharacterId;
  runMode?: RecordedRunMode;
  challengeKey?: string;
  limit?: number;
}

export interface LocalLeaderboardEntry {
  rank: number;
  run: Readonly<RunRecord>;
}

export type ProfileSource = Readonly<PlayerProfile> | (() => Readonly<PlayerProfile>);
