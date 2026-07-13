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
}

export interface EnemyState {
  id: number;
  position: Vec3;
  previousPosition: Vec3;
  radius: number;
  speed: number;
  hitPoints: number;
  hitFlash: number;
  lastBallHit: number;
}

export type MatchPhase = 'ready' | 'playing' | 'dead';

export interface GameState {
  phase: MatchPhase;
  elapsed: number;
  score: number;
  combo: number;
  comboTimer: number;
  nextEnemyId: number;
  spawnTimer: number;
  player: PlayerState;
  enemies: EnemyState[];
}
