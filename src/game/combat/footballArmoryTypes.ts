import type { ProgressionModifiers } from '../progression';
import type { Vec3 } from '../simulation/types';
import type { CombatTarget, SecondaryDamageHit } from './types';

export type FootballArmoryModifiers = Readonly<
  Pick<
    ProgressionModifiers,
    | 'headerCannonDamage'
    | 'headerCannonRadius'
    | 'headerCannonKnockback'
    | 'cornerStormDamage'
    | 'cornerStormStrikes'
    | 'cornerStormInterval'
    | 'redCardDamage'
    | 'redCardExecuteThreshold'
    | 'redCardStunDuration'
    | 'spectralTeammateCount'
    | 'spectralTeammateDamage'
    | 'spectralTeammateInterval'
    | 'penaltyMineDamage'
    | 'penaltyMineRadius'
    | 'penaltyMineCount'
    | 'bootCycloneDamage'
    | 'bootCycloneRadius'
    | 'bootCycloneInterval'
  >
>;

export interface FootballArmoryTarget extends CombatTarget {
  /** Optional normalized health used by Red Card; omitted targets cannot be executed. */
  healthRatio?: number;
}

export interface FootballArmoryStepInput {
  dt: number;
  playerPosition: Readonly<Vec3>;
  modifiers: FootballArmoryModifiers;
  targets: readonly FootballArmoryTarget[];
}

export type FootballArmoryEvent =
  | { type: 'header-fired'; position: Readonly<Vec3>; direction: Readonly<Vec3>; radius: number }
  | { type: 'header-knockback'; targetId: number; force: Readonly<Vec3> }
  | { type: 'corner-strike'; targetId: number; position: Readonly<Vec3>; strikeIndex: number }
  | { type: 'red-card'; targetId: number; position: Readonly<Vec3>; executed: boolean; stunDuration: number }
  | { type: 'teammate-volley'; targetId: number; position: Readonly<Vec3>; teammateIndex: number }
  | { type: 'penalty-mine-planted'; mineIndex: number; position: Readonly<Vec3>; radius: number }
  | { type: 'penalty-mine-detonated'; mineIndex: number; position: Readonly<Vec3>; radius: number }
  | { type: 'boot-cyclone'; position: Readonly<Vec3>; radius: number };

export interface PenaltyMineRenderState {
  active: boolean;
  armed: boolean;
  position: Vec3;
  radius: number;
}

/** Arrays and nested pooled positions are reused until the next step. */
export interface FootballArmoryStepResult {
  readonly hits: readonly SecondaryDamageHit[];
  readonly events: readonly FootballArmoryEvent[];
  readonly penaltyMines: readonly PenaltyMineRenderState[];
}
