import type { MatchDirectorConfig } from './types';

/** Assisted training pacing. The first goal completes the guided session. */
export const TUTORIAL_MATCH_CONFIG: MatchDirectorConfig = {
  id: 'guided-kickoff-3-minute',
  opening: { minimumMatchTime: 4, deadlineMatchTime: 12, killTarget: 2 },
  firstHalf: { minimumMatchTime: 24, deadlineMatchTime: 42, killTarget: 7 },
  goalOpportunityDuration: 45,
  escalation: { minimumMatchTime: 95, deadlineMatchTime: 110, killTarget: 18 },
  halftimeChoiceDuration: 4,
  defaultHalftimeChoice: 'control',
  bloodMoon: { minimumMatchTime: 130, deadlineMatchTime: 145, killTarget: 28 },
  finalGoalDuration: 20,
  finalWave: { minimumMatchTime: 165, deadlineMatchTime: 180, killTarget: 38 },
};

/** Fast balancing target for the initial playable vertical slice (~3 minutes). */
export const PROTOTYPE_MATCH_CONFIG: MatchDirectorConfig = {
  id: 'prototype-3-minute',
  opening: { minimumMatchTime: 8, deadlineMatchTime: 18, killTarget: 4 },
  firstHalf: { minimumMatchTime: 35, deadlineMatchTime: 50, killTarget: 15 },
  goalOpportunityDuration: 12,
  escalation: { minimumMatchTime: 75, deadlineMatchTime: 90, killTarget: 30 },
  halftimeChoiceDuration: 8,
  defaultHalftimeChoice: 'power',
  bloodMoon: { minimumMatchTime: 120, deadlineMatchTime: 138, killTarget: 50 },
  finalGoalDuration: 12,
  finalWave: { minimumMatchTime: 165, deadlineMatchTime: 180, killTarget: 70 },
};

/** Full production pacing target: nine minutes, within the intended 8–10 minute run. */
export const FULL_MATCH_CONFIG: MatchDirectorConfig = {
  id: 'full-9-minute',
  opening: { minimumMatchTime: 18, deadlineMatchTime: 30, killTarget: 10 },
  firstHalf: { minimumMatchTime: 125, deadlineMatchTime: 165, killTarget: 65 },
  goalOpportunityDuration: 25,
  escalation: { minimumMatchTime: 235, deadlineMatchTime: 270, killTarget: 120 },
  halftimeChoiceDuration: 15,
  defaultHalftimeChoice: 'power',
  bloodMoon: { minimumMatchTime: 390, deadlineMatchTime: 430, killTarget: 215 },
  finalGoalDuration: 25,
  finalWave: { minimumMatchTime: 500, deadlineMatchTime: 540, killTarget: 285 },
};
