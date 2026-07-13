import type { EnemyArchetype, EnemyState, GameState, Vec3 } from './types';

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

  const cap = Math.min(72, 14 + Math.floor(state.elapsed / 8) * 3);
  if (state.spawnTimer <= 0 && state.enemies.length < cap) {
    state.enemies.push(spawnEnemy(state));
    state.spawnTimer = Math.max(0.2, 0.95 - state.elapsed * 0.008);
  }

  const player = state.player;
  for (const enemy of state.enemies) {
    copyVec3(enemy.previousPosition, enemy.position);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.lastBallHit = Math.max(0, enemy.lastBallHit - dt);
    let dx = player.position.x - enemy.position.x;
    let dz = player.position.z - enemy.position.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const crowdSlow = distance < 1.45 ? 0.5 : 1;

    // Coaches accelerate nearby allies. This is deliberately a cheap radius check
    // rather than a persistent buff object, so removing the coach removes its aura.
    enemy.buffed = false;
    if (enemy.archetype !== 'coach') {
      for (const ally of state.enemies) {
        if (ally.archetype !== 'coach') continue;
        const coachDx = ally.position.x - enemy.position.x;
        const coachDz = ally.position.z - enemy.position.z;
        if (coachDx * coachDx + coachDz * coachDz < 30.25) {
          enemy.buffed = true;
          break;
        }
      }
    }

    // Local separation keeps the crowd readable and prevents enemies occupying
    // the same point. No temporary vectors or arrays are created in this loop.
    let separationX = 0;
    let separationZ = 0;
    for (const other of state.enemies) {
      if (other === enemy) continue;
      const awayX = enemy.position.x - other.position.x;
      const awayZ = enemy.position.z - other.position.z;
      const separationRadius = enemy.radius + other.radius + 0.18;
      const distanceSquared = awayX * awayX + awayZ * awayZ;
      if (distanceSquared <= 0.0001 || distanceSquared >= separationRadius * separationRadius) continue;
      const neighbourDistance = Math.sqrt(distanceSquared);
      const pressure = (separationRadius - neighbourDistance) / separationRadius;
      separationX += (awayX / neighbourDistance) * pressure;
      separationZ += (awayZ / neighbourDistance) * pressure;
    }

    const speedBuff = enemy.buffed ? 1.28 : 1;
    dx = dx / distance + separationX * 1.35;
    dz = dz / distance + separationZ * 1.35;
    const moveLength = Math.max(1, Math.hypot(dx, dz));
    enemy.position.x = clamp(
      enemy.position.x + (dx / moveLength) * enemy.speed * speedBuff * crowdSlow * dt,
      -ARENA_HALF_WIDTH,
      ARENA_HALF_WIDTH,
    );
    enemy.position.z = clamp(
      enemy.position.z + (dz / moveLength) * enemy.speed * speedBuff * crowdSlow * dt,
      -ARENA_HALF_DEPTH,
      ARENA_HALF_DEPTH,
    );

    if (distance < enemy.radius + 0.58 && player.invulnerability <= 0) {
      player.health = Math.max(0, player.health - enemy.attackDamage);
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

  let kills = 0;
  // Remove dead enemies in-place to avoid allocating a new crowd array on hits.
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    if (state.enemies[index]!.hitPoints > 0) continue;
    state.enemies.splice(index, 1);
    kills += 1;
  }
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
  const archetype = pickArchetype(state.elapsed);
  const stats = enemyStats(archetype, state.elapsed);
  const position = { x, y: stats.y, z };
  return {
    id: state.nextEnemyId++,
    archetype,
    position,
    previousPosition: { ...position },
    radius: stats.radius,
    speed: stats.speed,
    attackDamage: stats.attackDamage,
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints,
    hitFlash: 0,
    lastBallHit: 0,
    buffed: false,
  };
}

function pickArchetype(elapsed: number): EnemyArchetype {
  // Availability and weights ramp with match time, keeping the opening readable.
  const fanWeight = Math.max(38, 72 - elapsed * 0.16);
  const wingerWeight = elapsed < 10 ? 0 : Math.min(30, 10 + (elapsed - 10) * 0.18);
  const defenderWeight = elapsed < 24 ? 0 : Math.min(24, 5 + (elapsed - 24) * 0.15);
  const coachWeight = elapsed < 40 ? 0 : Math.min(14, 3 + (elapsed - 40) * 0.08);
  let roll = Math.random() * (fanWeight + wingerWeight + defenderWeight + coachWeight);
  if ((roll -= fanWeight) < 0) return 'bloodFan';
  if ((roll -= wingerWeight) < 0) return 'winger';
  if ((roll -= defenderWeight) < 0) return 'defender';
  return 'coach';
}

function enemyStats(archetype: EnemyArchetype, elapsed: number): {
  radius: number;
  speed: number;
  attackDamage: number;
  hitPoints: number;
  y: number;
} {
  const pace = Math.min(0.75, elapsed * 0.006);
  switch (archetype) {
    case 'winger':
      return { radius: 0.42, speed: 3.65 + pace, attackDamage: 10, hitPoints: 1, y: 0.82 };
    case 'defender':
      // Defender is the durable archetype. Directional shielding can be added once
      // the combat API exposes the ball velocity, rather than only its speed.
      return { radius: 0.76, speed: 1.35 + pace * 0.35, attackDamage: 22, hitPoints: 4, y: 1.02 };
    case 'coach':
      return { radius: 0.6, speed: 1.7 + pace * 0.5, attackDamage: 12, hitPoints: 2, y: 0.98 };
    case 'bloodFan':
      return { radius: 0.52, speed: 2.1 + pace, attackDamage: 14, hitPoints: 1, y: 0.9 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function copyVec3(target: Vec3, source: Vec3): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}
