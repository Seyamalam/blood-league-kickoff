import type { MatchDirectorConfig } from './types';

/** Fast balancing target for the initial playable vertical slice (~3 minutes). */
export const PROTOTYPE_MATCH_CONFIG: MatchDirectorConfig = {
  id: 'prototype-3-minute',
  opening: { minimumMatchTime: 8, deadlineMatchTime: 18, killTarget: 4 },
  firstHalf: { minimumMatchTime: 42, deadlineMatchTime: 70, killTarget: 22 },
  goalOpportunityDuration: 20,
  escalation: { minimumMatchTime: 112, deadlineMatchTime: 140, killTarget: 48 },
  finalWave: { minimumMatchTime: 162, deadlineMatchTime: 180, killTarget: 75 },
};

/** A data-only starting point for the intended 8–10 minute jam build. */
export const FULL_MATCH_CONFIG: MatchDirectorConfig = {
  id: 'full-9-minute',
  opening: { minimumMatchTime: 18, deadlineMatchTime: 30, killTarget: 10 },
  firstHalf: { minimumMatchTime: 135, deadlineMatchTime: 180, killTarget: 75 },
  goalOpportunityDuration: 35,
  escalation: { minimumMatchTime: 300, deadlineMatchTime: 360, killTarget: 180 },
  finalWave: { minimumMatchTime: 480, deadlineMatchTime: 540, killTarget: 300 },
};
