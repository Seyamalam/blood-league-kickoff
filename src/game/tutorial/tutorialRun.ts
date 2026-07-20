import type { TutorialStepId } from './types';

export const TUTORIAL_RUN_TIME_LIMIT = 180;
export const TUTORIAL_COMPLETION_CELEBRATION = 2.4;

export type TutorialAssist = 'prepare-ultimate' | 'spawn-progression-shards';
export type TutorialRunOutcome = 'active' | 'completed' | 'time-expired';

export interface TutorialRunState {
  elapsed: number;
  completionDelay: number | null;
  outcome: TutorialRunOutcome;
}

export function createTutorialRunState(): TutorialRunState {
  return { elapsed: 0, completionDelay: null, outcome: 'active' };
}

export function tutorialAssistsFor(steps: readonly TutorialStepId[]): readonly TutorialAssist[] {
  const assists: TutorialAssist[] = [];
  if (steps.includes('dash')) assists.push('prepare-ultimate');
  if (steps.includes('ultimate')) assists.push('spawn-progression-shards');
  return assists;
}

export function updateTutorialRun(
  previous: Readonly<TutorialRunState>,
  dt: number,
  tutorialComplete: boolean,
): TutorialRunState {
  if (previous.outcome !== 'active') return { ...previous };
  const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
  const elapsed = previous.elapsed + safeDt;
  let completionDelay = previous.completionDelay;
  if (tutorialComplete && completionDelay === null) completionDelay = TUTORIAL_COMPLETION_CELEBRATION;
  if (completionDelay !== null) {
    completionDelay = Math.max(0, completionDelay - safeDt);
    if (completionDelay <= 0) return { elapsed, completionDelay: 0, outcome: 'completed' };
  }
  if (elapsed >= TUTORIAL_RUN_TIME_LIMIT) {
    return { elapsed: TUTORIAL_RUN_TIME_LIMIT, completionDelay, outcome: 'time-expired' };
  }
  return { elapsed, completionDelay, outcome: 'active' };
}
