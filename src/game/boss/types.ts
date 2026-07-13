export interface BossVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type CountGoalkeeperPhase = 'entrance' | 'guarding' | 'bloodRush' | 'desperation' | 'defeated';
export type BossAction = 'idle' | 'telegraph' | 'charge' | 'recover';

export interface CountGoalkeeperConfig {
  readonly maxHealth: number;
  readonly radius: number;
  readonly goalLineZ: number;
  readonly goalHalfWidth: number;
  readonly arenaHalfWidth: number;
  readonly arenaHalfDepth: number;
  readonly entranceDuration: number;
  readonly guardingSpeed: number;
  readonly bloodRushHealthRatio: number;
  readonly desperationHealthRatio: number;
  readonly chargeCooldown: number;
  readonly telegraphDuration: number;
  readonly chargeDuration: number;
  readonly recoverDuration: number;
  readonly chargeSpeed: number;
  readonly desperationSpeedMultiplier: number;
  readonly contactDamage: number;
  readonly contactCooldown: number;
  readonly hitInvulnerability: number;
  readonly ballDamageMultiplier: number;
  readonly eliteSummonInterval: number;
}

export interface CountGoalkeeperState {
  readonly id: number;
  readonly phase: CountGoalkeeperPhase;
  readonly action: BossAction;
  readonly position: BossVec3;
  readonly previousPosition: BossVec3;
  readonly velocity: BossVec3;
  readonly chargeTarget: BossVec3;
  readonly health: number;
  readonly maxHealth: number;
  readonly phaseElapsed: number;
  readonly actionElapsed: number;
  readonly actionCooldown: number;
  readonly hitInvulnerability: number;
  readonly contactCooldown: number;
  readonly eliteSummonCooldown: number;
  readonly rngState: number;
}

export interface CountGoalkeeperUpdateInput {
  readonly dt: number;
  readonly playerPosition: BossVec3;
  readonly playerRadius?: number;
}

export type CountGoalkeeperEvent =
  | { readonly type: 'phaseChanged'; readonly from: CountGoalkeeperPhase; readonly to: CountGoalkeeperPhase }
  | { readonly type: 'chargeTelegraphed'; readonly target: BossVec3; readonly duration: number }
  | { readonly type: 'chargeStarted'; readonly velocity: BossVec3 }
  | { readonly type: 'contactAttack'; readonly damage: number }
  | { readonly type: 'summonElite'; readonly archetype: 'winger' | 'defender'; readonly side: -1 | 1 }
  | { readonly type: 'damaged'; readonly amount: number; readonly remainingHealth: number }
  | { readonly type: 'defeated' };

export interface CountGoalkeeperUpdate {
  readonly state: CountGoalkeeperState;
  readonly events: readonly CountGoalkeeperEvent[];
}

export interface BossDamageInput {
  readonly amount: number;
  readonly source: 'ball' | 'holy' | 'other';
}

export interface BossDamageResult extends CountGoalkeeperUpdate {
  readonly appliedDamage: number;
}

export interface FinalEliteConfig {
  readonly maxHealth: number;
  readonly radius: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly contactCooldown: number;
  readonly hitInvulnerability: number;
  readonly arenaHalfWidth: number;
  readonly arenaHalfDepth: number;
}

export interface FinalEliteState {
  readonly id: number;
  readonly position: BossVec3;
  readonly previousPosition: BossVec3;
  readonly health: number;
  readonly maxHealth: number;
  readonly contactCooldown: number;
  readonly hitInvulnerability: number;
  readonly defeated: boolean;
}

export type FinalEliteEvent =
  | { readonly type: 'contactAttack'; readonly damage: number }
  | { readonly type: 'damaged'; readonly amount: number; readonly remainingHealth: number }
  | { readonly type: 'defeated' };

export interface FinalEliteUpdate {
  readonly state: FinalEliteState;
  readonly events: readonly FinalEliteEvent[];
}
