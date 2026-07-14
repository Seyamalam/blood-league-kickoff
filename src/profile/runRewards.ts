import type { CompletedRun } from './types';

/** Deterministic, bounded account reward for one completed match. */
export function calculateRunAccountXp(run: Readonly<CompletedRun>): number {
  const kills = integer(run.kills);
  const goals = integer(run.goals);
  const score = integer(run.score);
  const base =
    25 +
    Math.min(kills, 200) +
    Math.min(goals, 20) * 60 +
    Math.min(Math.floor(score / 500), 150) +
    (run.outcome === 'victory' ? 250 : 0);
  const multiplier = Number.isFinite(run.rewardMultiplier)
    ? Math.max(0.1, Math.min(5, run.rewardMultiplier ?? 1))
    : 1;
  return Math.round(base * multiplier);
}

function integer(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
