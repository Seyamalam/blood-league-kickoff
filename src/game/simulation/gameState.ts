import type { EnemyState, GameState, Vec3 } from './types';

const ARENA_HALF_WIDTH = 22;
const ARENA_HALF_DEPTH = 14;
const PLAYER_SPEED = 8.2;

export function createGameState(): GameState {
  return {
    phase: 'ready',
    elapsed: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    nextEnemyId: 1,
    spawnTimer: 0.8,
    player: {
      position: { x: 0, y: 0.9, z: 5 },
      previousPosition: { x: 0, y: 0.9, z: 5 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: Math.PI,
      health: 100,
      maxHealth: 100,
      invulnerability: 0,
    },
    enemies: [],
  };
}

export function resetGameState(state: GameState): void {
  Object.assign(state, createGameState());
}

export function updatePlayer(
  state: GameState,
  movement: { x: number; z: number },
  facing: number,
  dt: number,
): void {
  const player = state.player;
  copyVec3(player.previousPosition, player.position);
  const length = Math.hypot(movement.x, movement.z);
  const scale = length > 1 ? 1 / length : 1;
  const targetX = movement.x * scale * PLAYER_SPEED;
  const targetZ = movement.z * scale * PLAYER_SPEED;
  const acceleration = 1 - Math.exp(-14 * dt);

  player.velocity.x += (targetX - player.velocity.x) * acceleration;
  player.velocity.z += (targetZ - player.velocity.z) * acceleration;
  player.position.x = clamp(player.position.x + player.velocity.x * dt, -ARENA_HALF_WIDTH, ARENA_HALF_WIDTH);
  player.position.z = clamp(player.position.z + player.velocity.z * dt, -ARENA_HALF_DEPTH, ARENA_HALF_DEPTH);
  player.facing = facing;
  player.invulnerability = Math.max(0, player.invulnerability - dt);
}

export function updateEnemies(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  state.spawnTimer -= dt;
  state.comboTimer -= dt;
  if (state.comboTimer <= 0) state.combo = 0;

  const cap = Math.min(42, 12 + Math.floor(state.elapsed / 8) * 3);
  if (state.spawnTimer <= 0 && state.enemies.length < cap) {
    state.enemies.push(spawnEnemy(state));
    state.spawnTimer = Math.max(0.28, 1.05 - state.elapsed * 0.012);
  }

  const player = state.player;
  for (const enemy of state.enemies) {
    copyVec3(enemy.previousPosition, enemy.position);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.lastBallHit = Math.max(0, enemy.lastBallHit - dt);
    const dx = player.position.x - enemy.position.x;
    const dz = player.position.z - enemy.position.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const crowdSlow = distance < 1.5 ? 0.45 : 1;
    enemy.position.x += (dx / distance) * enemy.speed * crowdSlow * dt;
    enemy.position.z += (dz / distance) * enemy.speed * crowdSlow * dt;

    if (distance < enemy.radius + 0.58 && player.invulnerability <= 0) {
      player.health = Math.max(0, player.health - 14);
      player.invulnerability = 0.62;
      enemy.position.x -= (dx / distance) * 1.4;
      enemy.position.z -= (dz / distance) * 1.4;
      if (player.health <= 0) state.phase = 'dead';
    }
  }
}

export function damageEnemiesWithBall(state: GameState, ball: Vec3, speed: number): number {
  if (speed < 7) return 0;
  let hits = 0;
  for (const enemy of state.enemies) {
    if (enemy.lastBallHit > 0) continue;
    const distance = Math.hypot(ball.x - enemy.position.x, ball.z - enemy.position.z);
    if (distance < enemy.radius + 0.52 && Math.abs(ball.y - 0.75) < 1.35) {
      enemy.hitPoints -= speed > 17 ? 2 : 1;
      enemy.lastBallHit = 0.22;
      enemy.hitFlash = 0.12;
      hits += 1;
    }
  }

  const before = state.enemies.length;
  state.enemies = state.enemies.filter((enemy) => enemy.hitPoints > 0);
  const kills = before - state.enemies.length;
  if (kills > 0) {
    state.combo += kills;
    state.comboTimer = 2.2;
    state.score += kills * 100 * Math.max(1, state.combo);
  }
  return hits;
}

function spawnEnemy(state: GameState): EnemyState {
  const side = Math.floor(Math.random() * 4);
  const edgeX = 20.5;
  const edgeZ = 12.5;
  let x = (Math.random() * 2 - 1) * edgeX;
  let z = (Math.random() * 2 - 1) * edgeZ;
  if (side === 0) x = -edgeX;
  if (side === 1) x = edgeX;
  if (side === 2) z = -edgeZ;
  if (side === 3) z = edgeZ;
  const elite = Math.random() < Math.min(0.28, state.elapsed / 100);
  const position = { x, y: elite ? 1.05 : 0.9, z };
  return {
    id: state.nextEnemyId++,
    position,
    previousPosition: { ...position },
    radius: elite ? 0.72 : 0.52,
    speed: elite ? 1.55 : 2.15 + Math.min(1.35, state.elapsed * 0.018),
    hitPoints: elite ? 2 : 1,
    hitFlash: 0,
    lastBallHit: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function copyVec3(target: Vec3, source: Vec3): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}
