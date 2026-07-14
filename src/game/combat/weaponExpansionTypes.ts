import type { ProgressionModifiers } from '../progression';
import type { Vec3 } from '../simulation/types';
import type { CombatTarget, SecondaryDamageHit } from './types';

export type WeaponExpansionModifiers = Readonly<
  Pick<
    ProgressionModifiers,
    | 'dashShockwaveDamage'
    | 'dashShockwaveRadius'
    | 'dashShockwaveKnockback'
    | 'holyZoneDamage'
    | 'holyZoneRadius'
    | 'holyZoneDuration'
    | 'ricochetDamage'
    | 'ricochetTargets'
    | 'ricochetRange'
    | 'bloodBarrierCharges'
    | 'bloodBarrierRechargeMultiplier'
  >
>;

export interface WeaponExpansionStepInput {
  dt: number;
  playerPosition: Readonly<Vec3>;
  modifiers: WeaponExpansionModifiers;
  targets: readonly CombatTarget[];
}

export type WeaponExpansionEvent =
  | { type: 'dash-shockwave'; position: Readonly<Vec3>; radius: number }
  | {
      type: 'dash-shockwave-knockback';
      targetId: number;
      force: Readonly<Vec3>;
    }
  | { type: 'holy-zone-spawned'; position: Readonly<Vec3>; radius: number; duration: number }
  | { type: 'holy-zone-pulse'; position: Readonly<Vec3>; radius: number }
  | {
      type: 'ricochet-hit';
      fromTargetId: number;
      targetId: number;
      jumpIndex: number;
      position: Readonly<Vec3>;
    }
  | { type: 'blood-barrier-changed'; charges: number; maxCharges: number }
  | { type: 'blood-barrier-blocked'; absorbedDamage: number; charges: number };

/** Arrays and nested pooled positions are reused until the next step/reset. */
export interface WeaponExpansionStepResult {
  readonly hits: readonly SecondaryDamageHit[];
  readonly events: readonly WeaponExpansionEvent[];
  readonly barrierCharges: number;
  readonly barrierMaxCharges: number;
}

/** This object is reused by the system and is valid until the next barrier call. */
export interface BloodBarrierResult {
  absorbedDamage: number;
  remainingDamage: number;
  charges: number;
  maxCharges: number;
}
