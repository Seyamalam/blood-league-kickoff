import type { CharacterId } from '../characters';
import type { Vec3 } from '../simulation/types';
import type { CombatTarget } from './types';

export const CHARACTER_ULTIMATE_IDS = [
  'midnightOrchestra',
  'redlineCounter',
  'meteorHeader',
  'lastTouch',
  'fullPitchPress',
  'cleanSheet',
] as const;

export type CharacterUltimateId = (typeof CHARACTER_ULTIMATE_IDS)[number];

export interface CharacterUltimateDefinition {
  readonly id: CharacterUltimateId;
  readonly characterId: CharacterId;
  readonly name: string;
  readonly description: string;
  readonly callout: string;
  readonly iconId: string;
  readonly chargeRequired: number;
  readonly duration: number;
}

export interface UltimateTarget extends CombatTarget {
  readonly threat?: 'normal' | 'elite' | 'boss';
}

export interface CharacterUltimateState {
  readonly characterId: CharacterId;
  readonly ultimateId: CharacterUltimateId;
  readonly charge: number;
  readonly chargeRequired: number;
  readonly activeRemaining: number;
  readonly activationCount: number;
  readonly ready: boolean;
}

export interface CharacterUltimateStepInput {
  readonly dt: number;
  readonly playerPosition: Readonly<Vec3>;
  readonly facingDirection: Readonly<Vec3>;
  readonly targets: readonly UltimateTarget[];
  readonly activate?: boolean;
}

export interface CharacterUltimateEffects {
  readonly movementSpeedMultiplier: number;
  readonly dashCooldownMultiplier: number;
  readonly ballDamageMultiplier: number;
  readonly eliteDamageMultiplier: number;
  readonly recallSpeedMultiplier: number;
  readonly volleyWindowBonus: number;
  readonly pickupRadiusMultiplier: number;
  readonly damageTakenMultiplier: number;
  readonly knockbackMultiplier: number;
}

export interface CharacterUltimateHit {
  readonly targetId: number;
  readonly damage: number;
  readonly source: CharacterUltimateId;
  readonly position: Readonly<Vec3>;
}

export type CharacterUltimateEvent =
  | {
      readonly type: 'ultimate-activated';
      readonly ultimateId: CharacterUltimateId;
      readonly position: Readonly<Vec3>;
      readonly duration: number;
    }
  | {
      readonly type: 'spectral-assist';
      readonly targetId: number;
      readonly from: Readonly<Vec3>;
      readonly to: Readonly<Vec3>;
      readonly passIndex: number;
    }
  | { readonly type: 'redline-pulse'; readonly position: Readonly<Vec3>; readonly radius: number }
  | { readonly type: 'meteor-header'; readonly position: Readonly<Vec3>; readonly range: number }
  | {
      readonly type: 'ultimate-knockback';
      readonly targetId: number;
      readonly force: Readonly<Vec3>;
    }
  | { readonly type: 'last-touch-strike'; readonly targetId: number; readonly position: Readonly<Vec3> }
  | { readonly type: 'full-pitch-pulse'; readonly position: Readonly<Vec3>; readonly radius: number }
  | { readonly type: 'clean-sheet-aegis'; readonly position: Readonly<Vec3> };

/** Reused until the next step call. Copy values if they must be retained. */
export interface CharacterUltimateStepResult {
  readonly activated: boolean;
  readonly hits: readonly CharacterUltimateHit[];
  readonly events: readonly CharacterUltimateEvent[];
  readonly effects: CharacterUltimateEffects;
  /** Healing to apply this simulation step, already scaled by dt where appropriate. */
  readonly healing: number;
  readonly state: CharacterUltimateState;
}
