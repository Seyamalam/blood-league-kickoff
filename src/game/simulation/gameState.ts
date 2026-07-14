import type { EliteEnemyArchetype, EnemyArchetype, EnemyState, GameState, Vec3 } from './types';
import { EnemySpatialGrid } from './EnemySpatialGrid';
import type { SecondaryDamageHit } from '../combat';
import {
  inferSpawnDirectorInput,
  resolveSpawnProfileInto,
  selectSpawnArchetype,
  type MutableSpawnProfile,
  type SpawnDirectorInput,
  type SpawnRandomSource,
} from '../spawn';

const ARENA_HALF_WIDTH = 22;
const ARENA_HALF_DEPTH = 14;
const PLAYER_SPEED = 8.2;
const PLAYER_DASH_SPEED = 22;
const PLAYER_DASH_DURATION = 0.16;
const PLAYER_DASH_COOLDOWN = 1.35;
const PLAYER_DASH_INVULNERABILITY = 0.18;
const FAR_ENEMY_DECISION_DISTANCE = 10;
const FAR_ENEMY_DECISION_SLICES = 4;
const enemySpatialGrid = new EnemySpatialGrid();
const spawnProfileScratch: MutableSpawnProfile = {
  enabled: false,
  matchElapsed: 0,
  populationCap: 0,
  spawnInterval: Number.POSITIVE_INFINITY,
  roster: [],
};

export function createGameState(): GameState {
  return {
    phase: 'ready',
    elapsed: 0,
    score: 0,
    kills: 0,
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
      dashCooldown: 0,
      dashTime: 0,
      dashDirection: { x: 0, y: 0, z: -1 },
    },
    enemies: [],
  };
}

export function resetGameState(state: GameState): void {
  Object.assign(state, createGameState());
}

/** Resets the on-pitch formation after a goal without touching run rewards or health. */
export function resetKickoffFormation(state: GameState): void {
  state.enemies.length = 0;
  state.spawnTimer = 0.8;
  state.player.position.x = 0;
  state.player.position.y = 0.9;
  state.player.position.z = 0;
  copyVec3(state.player.previousPosition, state.player.position);
  state.player.velocity.x = 0;
  state.player.velocity.y = 0;
  state.player.velocity.z = 0;
  state.player.dashTime = 0;
}

export function updatePlayer(
  state: GameState,
  movement: { x: number; z: number; dash?: boolean },
  facing: number,
  dt: number,
  movementSpeedMultiplier = 1,
): void {
  const player = state.player;
  copyVec3(player.previousPosition, player.position);
  const length = Math.hypot(movement.x, movement.z);
  const scale = length > 1 ? 1 / length : 1;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);

  const safeMovementMultiplier = Number.isFinite(movementSpeedMultiplier)
    ? clamp(movementSpeedMultiplier, 0.5, 2)
    : 1;

  if (movement.dash && player.dashCooldown <= 0) {
    const hasMoveDirection = length > 0.001;
    player.dashDirection.x = hasMoveDirection ? movement.x * scale : -Math.sin(facing);
    player.dashDirection.z = hasMoveDirection ? movement.z * scale : -Math.cos(facing);
    player.dashTime = PLAYER_DASH_DURATION;
    player.dashCooldown = PLAYER_DASH_COOLDOWN * (safeMovementMultiplier > 1 ? 0.8 : 1);
    player.invulnerability = Math.max(player.invulnerability, PLAYER_DASH_INVULNERABILITY);
  }

  if (player.dashTime > 0) {
    player.velocity.x = player.dashDirection.x * PLAYER_DASH_SPEED;
    player.velocity.z = player.dashDirection.z * PLAYER_DASH_SPEED;
    player.dashTime = Math.max(0, player.dashTime - dt);
  } else {
    const targetX = movement.x * scale * PLAYER_SPEED * safeMovementMultiplier;
    const targetZ = movement.z * scale * PLAYER_SPEED * safeMovementMultiplier;
    const acceleration = 1 - Math.exp(-14 * dt);
    player.velocity.x += (targetX - player.velocity.x) * acceleration;
    player.velocity.z += (targetZ - player.velocity.z) * acceleration;
  }
  player.position.x = clamp(player.position.x + player.velocity.x * dt, -ARENA_HALF_WIDTH, ARENA_HALF_WIDTH);
  player.position.z = clamp(player.position.z + player.velocity.z * dt, -ARENA_HALF_DEPTH, ARENA_HALF_DEPTH);
  player.facing = facing;
  player.invulnerability = Math.max(0, player.invulnerability - dt);
}

export function updateEnemies(
  state: GameState,
  dt: number,
  spawnInput: Readonly<SpawnDirectorInput> = inferSpawnDirectorInput(state.elapsed),
  rng: SpawnRandomSource = Math.random,
): void {
  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  state.comboTimer -= dt;
  if (state.comboTimer <= 0) state.combo = 0;

  const spawnProfile = resolveSpawnProfileInto(spawnInput, spawnProfileScratch);
  if (spawnProfile.enabled) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < spawnProfile.populationCap) {
      const archetype = selectSpawnArchetype(spawnProfile, rng);
      if (archetype) state.enemies.push(spawnEnemy(state, archetype, rng));
      state.spawnTimer = spawnProfile.spawnInterval;
    }
  }

  const player = state.player;
  enemySpatialGrid.rebuild(state.enemies);
  for (let enemyIndex = 0; enemyIndex < state.enemies.length; enemyIndex += 1) {
    const enemy = state.enemies[enemyIndex]!;
    copyVec3(enemy.previousPosition, enemy.position);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.shieldFlash = Math.max(0, enemy.shieldFlash - dt);
    enemy.lastBallHit = Math.max(0, enemy.lastBallHit - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    let dx = player.position.x - enemy.position.x;
    let dz = player.position.z - enemy.position.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const crowdSlow = distance < 1.45 ? 0.5 : 1;
    const refreshDecision = shouldRefreshEnemyDecision(enemy, distance, state.elapsed);

    // Coaches accelerate nearby allies. This is deliberately a cheap radius check
    // rather than a persistent buff object, so removing the coach removes its aura.
    // Far ordinary bodies retain the last result for at most three fixed ticks.
    if (refreshDecision) {
      enemy.buffed = false;
      if (enemy.archetype !== 'coach') {
        enemy.buffed = enemySpatialGrid.hasNearbyCoach(state.enemies, enemyIndex, 5.5);
      }
    }

    // Local separation keeps the crowd readable and prevents enemies occupying
    // the same point. Far ordinary bodies stagger this decision while continuing
    // to chase every tick, avoiding both crowd stalls and temporary allocations.
    if (refreshDecision) enemySpatialGrid.accumulateSeparation(state.enemies, enemyIndex, 0.18);
    const separationX = refreshDecision ? enemySpatialGrid.separationX : 0;
    const separationZ = refreshDecision ? enemySpatialGrid.separationZ : 0;

    const speedBuff = enemy.buffed ? 1.28 : 1;
    const chaseX = dx / distance;
    const chaseZ = dz / distance;
    dx = chaseX + separationX * 1.35;
    dz = chaseZ + separationZ * 1.35;
    const moveLength = Math.max(1, Math.hypot(dx, dz));
    let movementX = (dx / moveLength) * enemy.speed * speedBuff * crowdSlow;
    let movementZ = (dz / moveLength) * enemy.speed * speedBuff * crowdSlow;

    if (enemy.archetype === 'batSwarm') {
      // Swarms cut across the direct pursuit line in a predictable wave. The
      // enemy id offsets neighboring swarms without introducing frame-randomness.
      const weave = Math.sin(state.elapsed * 4.4 + enemy.id * 1.618) * 1.65;
      movementX -= chaseZ * weave;
      movementZ += chaseX * weave;
    }

    if (enemy.archetype === 'leechStriker') {
      updateLeechAttack(enemy, distance, dt);
      if (enemy.attackState === 'drain' || enemy.attackState === 'recover') {
        movementX = 0;
        movementZ = 0;
      }
    }

    if (enemy.archetype === 'corruptReferee') {
      const whistleHit = updateRefereeAttack(enemy, distance, dt);
      if (whistleHit && distance <= 6.5 && player.invulnerability <= 0) {
        player.health = Math.max(0, player.health - enemy.attackDamage);
        player.invulnerability = 0.45;
        if (player.health <= 0) state.phase = 'dead';
      }
      if (enemy.attackState !== 'chase' || (distance >= 4.5 && distance <= 6.5)) {
        movementX = 0;
        movementZ = 0;
      } else if (distance < 4.5) {
        movementX = -chaseX * enemy.speed * speedBuff;
        movementZ = -chaseZ * enemy.speed * speedBuff;
      }
    }

    if (enemy.archetype === 'winger') {
      updateWingerAttack(enemy, player.position, distance, dt);
      if (enemy.attackState === 'telegraph' || enemy.attackState === 'recover') {
        movementX = 0;
        movementZ = 0;
      } else if (enemy.attackState === 'lunge') {
        movementX = enemy.attackDirection.x * 8.4;
        movementZ = enemy.attackDirection.z * 8.4;
      }
    }

    const slowMultiplier = enemy.slowTimer > 0 ? enemy.slowSpeedMultiplier : 1;
    movementX *= slowMultiplier;
    movementZ *= slowMultiplier;

    const knockbackDamping = Math.exp(-7.5 * dt);
    movementX += enemy.knockbackVelocity.x;
    movementZ += enemy.knockbackVelocity.z;
    enemy.position.x = clamp(enemy.position.x + movementX * dt, -ARENA_HALF_WIDTH, ARENA_HALF_WIDTH);
    enemy.position.z = clamp(enemy.position.z + movementZ * dt, -ARENA_HALF_DEPTH, ARENA_HALF_DEPTH);
    enemy.knockbackVelocity.x *= knockbackDamping;
    enemy.knockbackVelocity.z *= knockbackDamping;

    const contactDx = player.position.x - enemy.position.x;
    const contactDz = player.position.z - enemy.position.z;
    const contactDistance = Math.max(0.001, Math.hypot(contactDx, contactDz));
    if (contactDistance < enemy.radius + 0.58 && player.invulnerability <= 0) {
      if (enemy.archetype === 'leechStriker') {
        if (enemy.attackState !== 'drain') continue;
        // The short immunity window creates several clear drain pulses during a
        // latch while the striker converts each successful pulse into health.
        player.health = Math.max(0, player.health - enemy.attackDamage);
        player.invulnerability = 0.18;
        enemy.hitPoints = Math.min(enemy.maxHitPoints, enemy.hitPoints + 1);
      } else {
        player.health = Math.max(0, player.health - enemy.attackDamage);
        player.invulnerability = 0.62;
        enemy.position.x -= (contactDx / contactDistance) * 1.4;
        enemy.position.z -= (contactDz / contactDistance) * 1.4;
      }
      if (player.health <= 0) state.phase = 'dead';
    }
  }
}

function shouldRefreshEnemyDecision(enemy: EnemyState, distance: number, elapsed: number): boolean {
  if (distance <= FAR_ENEMY_DECISION_DISTANCE) return true;
  if (
    enemy.archetype !== 'bloodFan' &&
    enemy.archetype !== 'defender' &&
    enemy.archetype !== 'goalkeeperBrute'
  ) {
    return true;
  }
  const fixedTick = Math.round(elapsed * 60);
  return (fixedTick + enemy.id) % FAR_ENEMY_DECISION_SLICES === 0;
}

export interface BallDamageResult {
  hits: number;
  kills: number;
  blockedHits: number;
  firstHitEnemyId?: number;
  rebound?: {
    enemyId: number;
    normal: Vec3;
    velocityMultiplier: number;
  };
}

export function damageEnemiesWithBall(
  state: GameState,
  ball: Vec3,
  speed: number,
  damageMultiplier = 1,
  ballVelocity?: Vec3,
  pierceCount = 0,
): BallDamageResult {
  if (speed < 7) return { hits: 0, kills: 0, blockedHits: 0 };
  const safeDamageMultiplier = Number.isFinite(damageMultiplier)
    ? Math.max(0, Math.min(8, damageMultiplier))
    : 1;
  let hits = 0;
  let blockedHits = 0;
  let firstHitEnemyId: number | undefined;
  let rebound: BallDamageResult['rebound'];
  const velocityLength = ballVelocity ? Math.hypot(ballVelocity.x, ballVelocity.z) : 0;
  const velocityX = velocityLength > 0.001 ? ballVelocity!.x / velocityLength : 0;
  const velocityZ = velocityLength > 0.001 ? ballVelocity!.z / velocityLength : 0;
  for (const enemy of state.enemies) {
    if (enemy.lastBallHit > 0) continue;
    const distance = Math.hypot(ball.x - enemy.position.x, ball.z - enemy.position.z);
    if (distance < enemy.radius + 0.52 && Math.abs(ball.y - 0.75) < 1.35) {
      firstHitEnemyId ??= enemy.id;
      const baseDamage = (speed > 17 ? 2 : 1) * safeDamageMultiplier;
      let damage = baseDamage;
      let knockbackScale =
        enemy.archetype === 'defender' ? 0.42 : enemy.archetype === 'goalkeeperBrute' ? 0.18 : 1;

      if (enemy.archetype === 'goalkeeperBrute' && speed <= 17) {
        // Brutes catch ordinary shots outright, but the same power-shot speed
        // boundary used for bonus ball damage breaks through their guard.
        damage = 0;
        knockbackScale = 0;
        blockedHits += 1;
        enemy.shieldFlash = 0.28;
        const normalX = ball.x - enemy.position.x;
        const normalZ = ball.z - enemy.position.z;
        const normalLength = Math.hypot(normalX, normalZ);
        rebound ??= {
          enemyId: enemy.id,
          normal:
            normalLength > 0.001
              ? { x: normalX / normalLength, y: 0, z: normalZ / normalLength }
              : { x: -velocityX, y: 0, z: -velocityZ },
          velocityMultiplier: 0.45,
        };
      }

      if (enemy.archetype === 'defender' && velocityLength > 0.001) {
        const faceX = state.player.position.x - enemy.position.x;
        const faceZ = state.player.position.z - enemy.position.z;
        const faceLength = Math.max(0.001, Math.hypot(faceX, faceZ));
        const approachDot = velocityX * (faceX / faceLength) + velocityZ * (faceZ / faceLength);
        if (approachDot < -0.3) {
          // A frontal shot is absorbed unless sufficiently powered. The rebound
          // result lets the physics integration reflect the ball intentionally.
          const shieldReduction = pierceCount > 0 ? safeDamageMultiplier * 0.45 : safeDamageMultiplier;
          damage = Math.max(0, baseDamage - shieldReduction);
          knockbackScale = 0.12;
          blockedHits += 1;
          enemy.shieldFlash = 0.2;
          const normalX = ball.x - enemy.position.x;
          const normalZ = ball.z - enemy.position.z;
          const normalLength = Math.hypot(normalX, normalZ);
          rebound ??= {
            enemyId: enemy.id,
            normal:
              normalLength > 0.001
                ? { x: normalX / normalLength, y: 0, z: normalZ / normalLength }
                : { x: -velocityX, y: 0, z: -velocityZ },
            velocityMultiplier: pierceCount > 0 ? 0.88 : 0.72,
          };
        } else if (approachDot > 0.3) {
          // Shots from behind bypass the shield and earn one bonus damage unit.
          damage += safeDamageMultiplier;
          knockbackScale = 0.7;
        }
      }

      enemy.hitPoints -= damage;
      if (velocityLength > 0.001) {
        const impulse = Math.min(10, 2.6 + speed * 0.22) * knockbackScale;
        enemy.knockbackVelocity.x += velocityX * impulse;
        enemy.knockbackVelocity.z += velocityZ * impulse;
      }
      enemy.lastBallHit = 0.22;
      enemy.hitFlash = damage > 0 ? 0.12 : 0;
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
  awardKills(state, kills);
  const result: BallDamageResult = { hits, kills, blockedHits };
  if (firstHitEnemyId !== undefined) result.firstHitEnemyId = firstHitEnemyId;
  if (rebound) result.rebound = rebound;
  return result;
}

export function damageEnemiesWithSecondary(
  state: GameState,
  damageHits: readonly SecondaryDamageHit[],
): BallDamageResult {
  let hits = 0;
  for (const damageHit of damageHits) {
    const enemy = state.enemies.find((candidate) => candidate.id === damageHit.targetId);
    if (!enemy || damageHit.damage <= 0) continue;
    enemy.hitPoints -= damageHit.damage;
    enemy.hitFlash = 0.12;
    hits += 1;
  }
  let kills = 0;
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    if (state.enemies[index]!.hitPoints > 0) continue;
    state.enemies.splice(index, 1);
    kills += 1;
  }
  awardKills(state, kills);
  return { hits, kills, blockedHits: 0 };
}

export function applyEnemySlow(
  state: GameState,
  targetId: number,
  speedMultiplier: number,
  duration: number,
): boolean {
  const enemy = state.enemies.find((candidate) => candidate.id === targetId);
  if (!enemy || !Number.isFinite(speedMultiplier) || !Number.isFinite(duration) || duration <= 0)
    return false;
  const safeMultiplier = Math.max(0.2, Math.min(1, speedMultiplier));
  enemy.slowSpeedMultiplier =
    enemy.slowTimer > 0 ? Math.min(enemy.slowSpeedMultiplier, safeMultiplier) : safeMultiplier;
  enemy.slowTimer = Math.max(enemy.slowTimer, Math.min(6, duration));
  return true;
}

function awardKills(state: GameState, kills: number): void {
  if (kills <= 0) return;
  state.kills += kills;
  state.combo += kills;
  state.comboTimer = 2.2;
  state.score += kills * 100 * Math.max(1, state.combo);
}

function spawnEnemy(state: GameState, archetype: EnemyArchetype, rng: SpawnRandomSource): EnemyState {
  const side = Math.floor(normalizeRandom(rng()) * 4);
  const edgeX = 20.5;
  const edgeZ = 12.5;
  let x = (normalizeRandom(rng()) * 2 - 1) * edgeX;
  let z = (normalizeRandom(rng()) * 2 - 1) * edgeZ;
  if (side === 0) x = -edgeX;
  if (side === 1) x = edgeX;
  if (side === 2) z = -edgeZ;
  if (side === 3) z = edgeZ;
  const stats = enemyStats(archetype, state.elapsed);
  return createEnemyState(state, archetype, { x, y: stats.y, z }, false);
}

/** Adds an ordinary enemy at an explicit position for deterministic diagnostics and tests. */
export function spawnEnemyAt(state: GameState, archetype: EnemyArchetype, position: Vec3): EnemyState {
  const enemy = createEnemyState(state, archetype, position, false);
  state.enemies.push(enemy);
  return enemy;
}

/** Adds a boss-requested elite near the opponent goal and returns its live state. */
export function spawnEliteEnemy(state: GameState, archetype: EliteEnemyArchetype, side: -1 | 1): EnemyState {
  const stats = enemyStats(archetype, state.elapsed);
  const position = {
    x: side * (4.8 + Math.random() * 1.8),
    y: stats.y * 1.08,
    z: -11.5 + (Math.random() * 0.8 - 0.4),
  };
  const enemy = createEnemyState(state, archetype, position, true);
  state.enemies.push(enemy);
  return enemy;
}

function createEnemyState(
  state: GameState,
  archetype: EnemyArchetype,
  position: Vec3,
  elite: boolean,
): EnemyState {
  const stats = enemyStats(archetype, state.elapsed);
  const eliteModifier = elite ? 1.35 : 1;
  const hitPoints = elite
    ? Math.max(stats.hitPoints + 2, Math.ceil(stats.hitPoints * 1.65))
    : stats.hitPoints;
  return {
    id: state.nextEnemyId++,
    archetype,
    position,
    previousPosition: { ...position },
    radius: stats.radius * (elite ? 1.12 : 1),
    speed: stats.speed * (elite ? 1.14 : 1),
    attackDamage: Math.ceil(stats.attackDamage * (elite ? 1.25 : 1)),
    hitPoints,
    maxHitPoints: hitPoints,
    hitFlash: 0,
    lastBallHit: 0,
    buffed: false,
    knockbackVelocity: { x: 0, y: 0, z: 0 },
    attackState: 'chase',
    attackTimer: 0,
    attackCooldown: archetype === 'winger' ? 0.7 + Math.random() * 0.5 : 0,
    attackDirection: { x: 0, y: 0, z: 1 },
    shieldFlash: 0,
    slowSpeedMultiplier: 1,
    slowTimer: 0,
    elite,
    eliteModifier,
  };
}

function updateWingerAttack(enemy: EnemyState, player: Vec3, distance: number, dt: number): void {
  if (enemy.attackState === 'chase') {
    if (distance <= 4.5 && enemy.attackCooldown <= 0) {
      const dx = player.x - enemy.position.x;
      const dz = player.z - enemy.position.z;
      const length = Math.max(0.001, Math.hypot(dx, dz));
      enemy.attackDirection.x = dx / length;
      enemy.attackDirection.z = dz / length;
      enemy.attackState = 'telegraph';
      enemy.attackTimer = 0.42;
    }
    return;
  }

  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  if (enemy.attackTimer > 0) return;
  if (enemy.attackState === 'telegraph') {
    enemy.attackState = 'lunge';
    enemy.attackTimer = 0.34;
  } else if (enemy.attackState === 'lunge') {
    enemy.attackState = 'recover';
    enemy.attackTimer = 0.5;
  } else {
    enemy.attackState = 'chase';
    enemy.attackCooldown = 1.15;
  }
}

function updateLeechAttack(enemy: EnemyState, distance: number, dt: number): void {
  if (enemy.attackState === 'chase') {
    if (distance <= enemy.radius + 0.58 && enemy.attackCooldown <= 0) {
      enemy.attackState = 'drain';
      enemy.attackTimer = 0.82;
    }
    return;
  }

  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  if (enemy.attackTimer > 0) return;
  if (enemy.attackState === 'drain') {
    enemy.attackState = 'recover';
    enemy.attackTimer = 0.38;
  } else if (enemy.attackState === 'recover') {
    enemy.attackState = 'chase';
    enemy.attackCooldown = 1.1;
  }
}

function updateRefereeAttack(enemy: EnemyState, distance: number, dt: number): boolean {
  if (enemy.attackState === 'chase') {
    if (distance <= 6.5 && enemy.attackCooldown <= 0) {
      enemy.attackState = 'telegraph';
      enemy.attackTimer = 0.65;
    }
    return false;
  }

  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  if (enemy.attackTimer > 0) return false;
  if (enemy.attackState === 'telegraph') {
    enemy.attackState = 'whistle';
    enemy.attackTimer = 0.12;
    return true;
  }
  if (enemy.attackState === 'whistle') {
    enemy.attackState = 'recover';
    enemy.attackTimer = 0.45;
  } else if (enemy.attackState === 'recover') {
    enemy.attackState = 'chase';
    enemy.attackCooldown = 2.2;
  }
  return false;
}

function enemyStats(
  archetype: EnemyArchetype,
  elapsed: number,
): {
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
      return { radius: 0.76, speed: 1.35 + pace * 0.35, attackDamage: 22, hitPoints: 4, y: 1.02 };
    case 'coach':
      return { radius: 0.6, speed: 1.7 + pace * 0.5, attackDamage: 12, hitPoints: 2, y: 0.98 };
    case 'batSwarm':
      return { radius: 0.38, speed: 4.15 + pace, attackDamage: 8, hitPoints: 1, y: 1.25 };
    case 'leechStriker':
      return { radius: 0.48, speed: 2.8 + pace * 0.7, attackDamage: 4, hitPoints: 3, y: 0.94 };
    case 'corruptReferee':
      return { radius: 0.55, speed: 2.25 + pace * 0.45, attackDamage: 6, hitPoints: 3, y: 0.98 };
    case 'goalkeeperBrute':
      return { radius: 0.92, speed: 0.95 + pace * 0.25, attackDamage: 28, hitPoints: 8, y: 1.18 };
    case 'bloodFan':
      return { radius: 0.52, speed: 2.1 + pace, attackDamage: 14, hitPoints: 1, y: 0.9 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRandom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

function copyVec3(target: Vec3, source: Vec3): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}
