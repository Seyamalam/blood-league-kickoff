import type { SpawnDirectorConfig, SpawnRosterEntry } from './types';

const disabled = Object.freeze({ enabled: false } as const);

function roster(entries: readonly SpawnRosterEntry[]): readonly SpawnRosterEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

/**
 * Full-match pressure curve. Each combat stage owns its population budget,
 * cadence, and roster so balancing no longer leaks into the movement system.
 */
export const FULL_MATCH_SPAWN_CONFIG: SpawnDirectorConfig = Object.freeze({
  opening: Object.freeze({
    enabled: true,
    populationCapStart: 14,
    populationCapEnd: 22,
    spawnIntervalStart: 0.95,
    spawnIntervalEnd: 0.7,
    rampDuration: 30,
    roster: roster([
      { archetype: 'bloodFan', weight: 78, unlockMatchTime: 0 },
      { archetype: 'winger', weight: 22, unlockMatchTime: 10 },
    ]),
  }),
  firstHalf: Object.freeze({
    enabled: true,
    populationCapStart: 22,
    populationCapEnd: 56,
    spawnIntervalStart: 0.7,
    spawnIntervalEnd: 0.28,
    rampDuration: 135,
    roster: roster([
      { archetype: 'bloodFan', weight: 48, unlockMatchTime: 0 },
      { archetype: 'winger', weight: 22, unlockMatchTime: 10 },
      { archetype: 'defender', weight: 14, unlockMatchTime: 24 },
      { archetype: 'coach', weight: 6, unlockMatchTime: 40 },
      { archetype: 'batSwarm', weight: 8, unlockMatchTime: 55 },
      { archetype: 'leechStriker', weight: 2, unlockMatchTime: 95 },
    ]),
  }),
  goalOpportunity: disabled,
  escalation: Object.freeze({
    enabled: true,
    populationCapStart: 48,
    populationCapEnd: 64,
    spawnIntervalStart: 0.35,
    spawnIntervalEnd: 0.22,
    rampDuration: 105,
    roster: roster([
      { archetype: 'bloodFan', weight: 35, unlockMatchTime: 0 },
      { archetype: 'winger', weight: 18, unlockMatchTime: 10 },
      { archetype: 'defender', weight: 16, unlockMatchTime: 24 },
      { archetype: 'coach', weight: 8, unlockMatchTime: 40 },
      { archetype: 'batSwarm', weight: 10, unlockMatchTime: 55 },
      { archetype: 'leechStriker', weight: 7, unlockMatchTime: 95 },
      { archetype: 'corruptReferee', weight: 4, unlockMatchTime: 145 },
      { archetype: 'goalkeeperBrute', weight: 2, unlockMatchTime: 210 },
    ]),
  }),
  halftimeChoice: disabled,
  bloodMoon: Object.freeze({
    enabled: true,
    populationCapStart: 60,
    populationCapEnd: 72,
    spawnIntervalStart: 0.24,
    spawnIntervalEnd: 0.2,
    rampDuration: 160,
    roster: roster([
      { archetype: 'bloodFan', weight: 25 },
      { archetype: 'winger', weight: 18 },
      { archetype: 'defender', weight: 15 },
      { archetype: 'coach', weight: 8 },
      { archetype: 'batSwarm', weight: 13 },
      { archetype: 'leechStriker', weight: 10 },
      { archetype: 'corruptReferee', weight: 7 },
      { archetype: 'goalkeeperBrute', weight: 4 },
    ]),
  }),
  finalGoal: disabled,
  finalWave: Object.freeze({
    enabled: true,
    populationCapStart: 68,
    populationCapEnd: 72,
    spawnIntervalStart: 0.22,
    spawnIntervalEnd: 0.2,
    rampDuration: 110,
    roster: roster([
      { archetype: 'bloodFan', weight: 18 },
      { archetype: 'winger', weight: 20 },
      { archetype: 'defender', weight: 18 },
      { archetype: 'coach', weight: 8 },
      { archetype: 'batSwarm', weight: 12 },
      { archetype: 'leechStriker', weight: 10 },
      { archetype: 'corruptReferee', weight: 7 },
      { archetype: 'goalkeeperBrute', weight: 7 },
    ]),
  }),
  victory: disabled,
  dead: disabled,
});
