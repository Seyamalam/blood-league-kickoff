export type MatchStage =
  | 'opening'
  | 'firstHalf'
  | 'goalOpportunity'
  | 'escalation'
  | 'finalWave'
  | 'victory'
  | 'dead';

export type ActiveCombatStage = Exclude<MatchStage, 'goalOpportunity' | 'victory' | 'dead'>;

export interface CombatStageRule {
  /** The earliest match time at which kills may advance this stage. */
  minimumMatchTime: number;
  /** The match time at which this stage advances even if its kill target was missed. */
  deadlineMatchTime: number;
  /** Total kills required to advance after minimumMatchTime. */
  killTarget: number;
}

export interface MatchDirectorConfig {
  readonly id: string;
  readonly opening: CombatStageRule;
  readonly firstHalf: CombatStageRule;
  readonly goalOpportunityDuration: number;
  readonly escalation: CombatStageRule;
  readonly finalWave: CombatStageRule;
}

export interface MatchDirectorState {
  readonly stage: MatchStage;
  readonly matchElapsed: number;
  readonly stageElapsed: number;
  readonly totalKills: number;
  readonly goalScored: boolean;
}

export interface MatchDirectorInput {
  readonly dt: number;
  /** Monotonic total kills from the gameplay simulation. */
  readonly totalKills: number;
  readonly playerDead: boolean;
  /** A one-step signal emitted when the ball enters the active goal. */
  readonly goalScored?: boolean;
}

export type MatchDirectorEvent =
  | { readonly type: 'stageChanged'; readonly from: MatchStage; readonly to: MatchStage }
  | { readonly type: 'goalOpportunityStarted'; readonly duration: number }
  | { readonly type: 'goalScored' }
  | { readonly type: 'goalMissed' }
  | { readonly type: 'victory' }
  | { readonly type: 'playerDied' };

export interface MatchDirectorUpdate {
  readonly state: MatchDirectorState;
  readonly events: readonly MatchDirectorEvent[];
}

export type ObjectiveStatus = 'active' | 'completed' | 'failed';

export interface MatchObjective {
  readonly id: MatchStage;
  readonly title: string;
  readonly detail: string;
  readonly progress: number;
  readonly target: number;
  readonly unit: 'kills' | 'seconds' | 'goal' | 'outcome';
  readonly status: ObjectiveStatus;
}
