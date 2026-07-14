import type { MatchStage } from '../match';
import type { EnemyArchetype } from '../simulation/types';

export interface SpawnRosterEntry {
  readonly archetype: EnemyArchetype;
  readonly weight: number;
  /** Absolute match time at which this archetype can enter the weighted pool. */
  readonly unlockMatchTime?: number;
}

export interface CombatSpawnStageConfig {
  readonly enabled: true;
  readonly populationCapStart: number;
  readonly populationCapEnd: number;
  readonly spawnIntervalStart: number;
  readonly spawnIntervalEnd: number;
  readonly rampDuration: number;
  readonly roster: readonly SpawnRosterEntry[];
}

export interface DisabledSpawnStageConfig {
  readonly enabled: false;
}

export type SpawnStageConfig = CombatSpawnStageConfig | DisabledSpawnStageConfig;
export type SpawnDirectorConfig = Readonly<Record<MatchStage, SpawnStageConfig>>;

export interface SpawnDirectorInput {
  readonly stage: MatchStage;
  readonly stageElapsed: number;
  readonly matchElapsed: number;
}

export interface SpawnProfile {
  readonly enabled: boolean;
  readonly matchElapsed: number;
  readonly populationCap: number;
  readonly spawnInterval: number;
  readonly roster: readonly SpawnRosterEntry[];
}

/** Reusable target for allocation-free fixed-step profile resolution. */
export interface MutableSpawnProfile {
  enabled: boolean;
  matchElapsed: number;
  populationCap: number;
  spawnInterval: number;
  roster: readonly SpawnRosterEntry[];
}

export type SpawnRandomSource = () => number;
