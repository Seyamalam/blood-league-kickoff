export type MatchStage =
  | 'opening'
  | 'firstHalf'
  | 'goalOpportunity'
  | 'escalation'
  | 'halftimeChoice'
  | 'bloodMoon'
  | 'finalGoal'
  | 'finalWave'
  | 'victory'
  | 'dead';

export type ActiveCombatStage = 'opening' | 'firstHalf' | 'escalation' | 'bloodMoon' | 'finalWave';
export type GoalOpportunity = 'first' | 'final';
export type HalftimeChoice = 'power' | 'pace' | 'control';

export interface CombatStageRule {
  /** Earliest match time at which kills may advance this stage. */
  minimumMatchTime: number;
  /** Match time at which this stage advances even if its kill target was missed. */
  deadlineMatchTime: number;
  /** Monotonic total kills required to advance after minimumMatchTime. */
  killTarget: number;
}

export interface MatchDirectorConfig {
  readonly id: string;
  readonly opening: CombatStageRule;
  readonly firstHalf: CombatStageRule;
  /** Kept under its original name for prototype and integration compatibility. */
  readonly goalOpportunityDuration: number;
  readonly escalation: CombatStageRule;
  readonly halftimeChoiceDuration: number;
  readonly defaultHalftimeChoice: HalftimeChoice;
  readonly bloodMoon: CombatStageRule;
  readonly finalGoalDuration: number;
  readonly finalWave: CombatStageRule;
}

export interface MatchDirectorState {
  readonly stage: MatchStage;
  readonly matchElapsed: number;
  readonly stageElapsed: number;
  readonly totalKills: number;
  /** Legacy convenience flag: true once either goal opportunity is scored. */
  readonly goalScored: boolean;
  readonly goalsScored: number;
  readonly halftimeChoice: HalftimeChoice | null;
}

export interface MatchDirectorInput {
  readonly dt: number;
  /** Monotonic total kills from the gameplay simulation. */
  readonly totalKills: number;
  readonly playerDead: boolean;
  /** One-step signal emitted when the ball enters whichever goal is active. */
  readonly goalScored?: boolean;
  /** One-step selection signal. Only consumed during halftimeChoice. */
  readonly halftimeChoice?: HalftimeChoice;
  /** Defeating the final encounter immediately completes the final wave. */
  readonly bossDefeated?: boolean;
}

export type MatchDirectorEvent =
  | { readonly type: 'stageChanged'; readonly from: MatchStage; readonly to: MatchStage }
  | { readonly type: 'goalOpportunityStarted'; readonly goal: GoalOpportunity; readonly duration: number }
  | { readonly type: 'goalScored'; readonly goal: GoalOpportunity }
  | { readonly type: 'goalMissed'; readonly goal: GoalOpportunity }
  | { readonly type: 'halftimeChoiceStarted'; readonly duration: number }
  | { readonly type: 'halftimeChoiceSelected'; readonly choice: HalftimeChoice; readonly automatic: boolean }
  | { readonly type: 'bloodMoonStarted' }
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
  readonly unit: 'kills' | 'seconds' | 'goal' | 'choice' | 'outcome';
  readonly status: ObjectiveStatus;
}
