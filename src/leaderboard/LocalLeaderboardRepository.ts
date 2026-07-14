import type { PlayerProfile, RunRecord } from '../profile';
import type { LocalLeaderboardEntry, LocalLeaderboardQuery, ProfileSource } from './types';

/** Personal/local rankings. Online submission can implement a separate repository later. */
export class LocalLeaderboardRepository {
  public constructor(private readonly source: ProfileSource) {}

  public getEntries(query: Readonly<LocalLeaderboardQuery>): LocalLeaderboardEntry[] {
    const profile = this.readProfile();
    const limit = Number.isFinite(query.limit)
      ? Math.min(100, Math.max(1, Math.floor(query.limit ?? 10)))
      : 10;
    const eligible = profile.recentRuns.filter(
      (run) =>
        run.buildVersion === query.buildVersion &&
        (query.characterId === undefined || run.characterId === query.characterId) &&
        (query.runMode === undefined || run.runMode === query.runMode) &&
        (query.challengeKey === undefined || run.challengeKey === query.challengeKey) &&
        (query.category !== 'fastestVictory' || run.outcome === 'victory'),
    );
    eligible.sort(query.category === 'score' ? compareScore : compareFastestVictory);
    return eligible.slice(0, limit).map((run, index) => ({ rank: index + 1, run: cloneRun(run) }));
  }

  private readProfile(): Readonly<PlayerProfile> {
    return typeof this.source === 'function' ? this.source() : this.source;
  }
}

function compareScore(left: Readonly<RunRecord>, right: Readonly<RunRecord>): number {
  return (
    right.score - left.score ||
    left.timeSeconds - right.timeSeconds ||
    left.completedAt.localeCompare(right.completedAt)
  );
}

function compareFastestVictory(left: Readonly<RunRecord>, right: Readonly<RunRecord>): number {
  return (
    left.timeSeconds - right.timeSeconds ||
    right.score - left.score ||
    left.completedAt.localeCompare(right.completedAt)
  );
}

function cloneRun(run: Readonly<RunRecord>): RunRecord {
  return { ...run, upgradeIds: [...run.upgradeIds], evolutionIds: [...run.evolutionIds] };
}
