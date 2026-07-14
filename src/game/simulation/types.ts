export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  position: Vec3;
  previousPosition: Vec3;
  velocity: Vec3;
  facing: number;
  health: number;
  maxHealth: number;
  invulnerability: number;
  dashCooldown: number;
  dashTime: number;
  dashDirection: Vec3;
}

export type EnemyArchetype =
  | 'bloodFan'
  | 'winger'
  | 'defender'
  | 'coach'
  | 'batSwarm'
  | 'leechStriker'
  | 'corruptReferee'
  | 'bloodArcher'
  | 'shadowRunner'
  | 'corpseBomber'
  | 'goalkeeperBrute';
export type EliteEnemyArchetype = Extract<EnemyArchetype, 'winger' | 'defender'>;
export type EnemyAttackState =
  'chase' | 'telegraph' | 'lunge' | 'drain' | 'whistle' | 'volley' | 'vanish' | 'fuse' | 'recover';

export interface EnemyProjectileState {
  id: number;
  ownerId: number;
  position: Vec3;
  previousPosition: Vec3;
  velocity: Vec3;
  radius: number;
  damage: number;
  lifetime: number;
}

/** Transient one-step hooks for readable effects, SFX, and combat messaging. */
export type EnemyCombatEvent =
  | { readonly type: 'projectileSpawned'; readonly projectileId: number; readonly ownerId: number }
  | { readonly type: 'projectileHit'; readonly projectileId: number; readonly damage: number }
  | { readonly type: 'teleportTelegraphed'; readonly enemyId: number; readonly duration: number }
  | { readonly type: 'teleported'; readonly enemyId: number; readonly from: Vec3; readonly to: Vec3 }
  | {
      readonly type: 'explosionTelegraphed';
      readonly enemyId: number;
      readonly duration: number;
      readonly radius: number;
    }
  | {
      readonly type: 'exploded';
      readonly enemyId: number;
      readonly position: Vec3;
      readonly radius: number;
      readonly damage: number;
    };

export interface EnemyState {
  id: number;
  archetype: EnemyArchetype;
  position: Vec3;
  previousPosition: Vec3;
  radius: number;
  speed: number;
  attackDamage: number;
  hitPoints: number;
  maxHitPoints: number;
  hitFlash: number;
  lastBallHit: number;
  buffed: boolean;
  knockbackVelocity: Vec3;
  attackState: EnemyAttackState;
  attackTimer: number;
  attackCooldown: number;
  attackDirection: Vec3;
  shieldFlash: number;
  slowSpeedMultiplier: number;
  slowTimer: number;
  /** Boss-requested elites are visually distinguishable and use boosted stats. */
  elite: boolean;
  eliteModifier: number;
  /** Dedicated goal-line blocker spawned for scoring opportunities. */
  goalkeeper: boolean;
}

export type MatchPhase = 'ready' | 'playing' | 'dead' | 'won';

export interface GameState {
  phase: MatchPhase;
  elapsed: number;
  score: number;
  kills: number;
  combo: number;
  comboTimer: number;
  nextEnemyId: number;
  nextEnemyProjectileId: number;
  spawnTimer: number;
  player: PlayerState;
  enemies: EnemyState[];
  enemyProjectiles: EnemyProjectileState[];
  /** Cleared and repopulated by every updateEnemies call. */
  enemyEvents: EnemyCombatEvent[];
}
