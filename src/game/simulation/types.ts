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

export type EnemyArchetype = 'bloodFan' | 'winger' | 'defender' | 'coach' | 'batSwarm' | 'leechStriker';
export type EliteEnemyArchetype = Extract<EnemyArchetype, 'winger' | 'defender'>;
export type EnemyAttackState = 'chase' | 'telegraph' | 'lunge' | 'drain' | 'recover';

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
  /** Boss-requested elites are visually distinguishable and use boosted stats. */
  elite: boolean;
  eliteModifier: number;
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
  spawnTimer: number;
  player: PlayerState;
  enemies: EnemyState[];
}
