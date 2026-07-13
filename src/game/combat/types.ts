import type { ProgressionModifiers } from '../progression';
import type { Vec3 } from '../simulation/types';

export type SecondaryCombatModifiers = Readonly<
  Pick<
    ProgressionModifiers,
    | 'garlicTrailDamage'
    | 'orbitingBallCount'
    | 'orbitingBallDamage'
    | 'bloodBombDamage'
    | 'bloodBombRadius'
    | 'ghostPassCount'
    | 'ghostPassDamageMultiplier'
    | 'chainLightningDamage'
    | 'chainLightningTargets'
    | 'frostBurstDamage'
    | 'frostBurstRadius'
    | 'frostSlowAmount'
    | 'frostSlowDuration'
    | 'multiBallCount'
    | 'multiBallDamageMultiplier'
    | 'blackHoleDamage'
    | 'blackHoleRadius'
    | 'blackHolePullStrength'
    | 'blackHoleDuration'
  >
>;

export interface CombatTarget {
  id: number;
  position: Readonly<Vec3>;
  radius: number;
}

export interface SecondaryWeaponStepInput {
  dt: number;
  playerPosition: Readonly<Vec3>;
  ballPosition: Readonly<Vec3>;
  ballSpeed: number;
  ballInFlight: boolean;
  ballReturning: boolean;
  /** Base damage copied by a Ghost Pass. Defaults to one. */
  ballDamage?: number;
  modifiers: SecondaryCombatModifiers;
  targets: readonly CombatTarget[];
}

export type SecondaryDamageSource =
  | 'garlic-trail'
  | 'spectral-ball'
  | 'blood-bomb'
  | 'ghost-pass'
  | 'chain-lightning'
  | 'frost-burst'
  | 'multi-ball'
  | 'black-hole';

export interface SecondaryDamageHit {
  targetId: number;
  damage: number;
  source: SecondaryDamageSource;
  position: Readonly<Vec3>;
}

export type SecondaryWeaponEvent =
  | { type: 'garlic-zone-spawned'; position: Readonly<Vec3>; radius: number }
  | { type: 'spectral-ball-hit'; position: Readonly<Vec3>; targetId: number }
  | { type: 'blood-bomb-triggered'; position: Readonly<Vec3>; radius: number }
  | { type: 'ghost-pass-spawned'; position: Readonly<Vec3>; count: number }
  | { type: 'ghost-pass-hit'; position: Readonly<Vec3>; targetId: number }
  | {
      type: 'chain-lightning-hit';
      position: Readonly<Vec3>;
      fromTargetId: number;
      targetId: number;
      jumpIndex: number;
    }
  | { type: 'frost-burst-triggered'; position: Readonly<Vec3>; radius: number }
  | {
      type: 'frost-burst-hit';
      position: Readonly<Vec3>;
      targetId: number;
      speedMultiplier: number;
      duration: number;
    }
  | { type: 'multi-ball-spawned'; position: Readonly<Vec3>; count: number }
  | { type: 'multi-ball-hit'; position: Readonly<Vec3>; targetId: number; shotIndex: number }
  | { type: 'black-hole-spawned'; position: Readonly<Vec3>; radius: number; duration: number }
  | { type: 'black-hole-pulse'; position: Readonly<Vec3>; radius: number }
  | { type: 'black-hole-pull'; position: Readonly<Vec3>; targetId: number; force: Readonly<Vec3> };

/** Arrays are reused by the system and remain valid only until its next step/reset. */
export interface SecondaryWeaponStepResult {
  readonly hits: readonly SecondaryDamageHit[];
  readonly events: readonly SecondaryWeaponEvent[];
}

export interface GarlicZoneState {
  active: boolean;
  position: Vec3;
  radius: number;
  age: number;
  lifetime: number;
}

export interface OrbitingBallState {
  active: boolean;
  position: Vec3;
  radius: number;
}

export interface GhostPassState {
  active: boolean;
  position: Vec3;
  velocity: Vec3;
  radius: number;
  age: number;
  lifetime: number;
}

export interface MultiBallShotState {
  active: boolean;
  position: Vec3;
  velocity: Vec3;
  radius: number;
  age: number;
  lifetime: number;
}

export interface BlackHoleZoneState {
  active: boolean;
  position: Vec3;
  radius: number;
  age: number;
  lifetime: number;
}

export interface SecondaryWeaponRenderState {
  readonly garlicZones: readonly GarlicZoneState[];
  readonly orbitingBalls: readonly OrbitingBallState[];
  readonly ghostPasses: readonly GhostPassState[];
  readonly multiBallShots: readonly MultiBallShotState[];
  readonly blackHoleZones: readonly BlackHoleZoneState[];
}

export interface GhostPassTrigger {
  origin: Readonly<Vec3>;
  direction: Readonly<Vec3>;
  baseDamage?: number;
  modifiers: SecondaryCombatModifiers;
}

export interface MultiBallTrigger {
  origin: Readonly<Vec3>;
  direction: Readonly<Vec3>;
  baseDamage: number;
  modifiers: SecondaryCombatModifiers;
}
