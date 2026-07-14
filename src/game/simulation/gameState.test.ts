import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyEnemySlow,
  createGameState,
  damageEnemiesWithBall,
  damageEnemiesWithSecondary,
  resetKickoffFormation,
  spawnEliteEnemy,
  spawnGoalkeeperGuard,
  updateEnemies,
  updatePlayer,
} from './gameState';
import { GOALKEEPER_GUARD_Z, GOAL_HALF_WIDTH } from '../field';

describe('game state match helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets the formation without erasing run progress', () => {
    const state = createGameState();
    state.score = 2_400;
    state.kills = 18;
    state.player.health = 63;
    state.player.position = { x: 8, y: 0.9, z: -9 };
    spawnEliteEnemy(state, 'defender', 1);

    resetKickoffFormation(state);

    expect(state.enemies).toHaveLength(0);
    expect(state.player.position).toEqual({ x: 0, y: 0.9, z: 0 });
    expect(state.score).toBe(2_400);
    expect(state.kills).toBe(18);
    expect(state.player.health).toBe(63);
  });

  it('creates readable boss-requested elites with boosted combat stats', () => {
    const state = createGameState();
    const normal = spawnEliteEnemy(state, 'winger', -1);

    expect(normal.elite).toBe(true);
    expect(normal.eliteModifier).toBeGreaterThan(1);
    expect(normal.hitPoints).toBeGreaterThan(normal.archetype === 'winger' ? 1 : 4);
    expect(normal.position.x).toBeLessThan(0);
    expect(state.enemies).toContain(normal);
  });

  it('spawns a special goalkeeper that tracks the ball across the real goal mouth', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.spawnTimer = 100;
    const goalkeeper = spawnGoalkeeperGuard(state, true);

    updateEnemies(state, 0.1, { stage: 'finalGoal', stageElapsed: 1, matchElapsed: 500 }, () => 0.5, {
      x: GOAL_HALF_WIDTH,
      y: 0.7,
      z: GOALKEEPER_GUARD_Z,
    });

    expect(goalkeeper.goalkeeper).toBe(true);
    expect(goalkeeper.archetype).toBe('goalkeeperBrute');
    expect(goalkeeper.position.x).toBeGreaterThan(0);
    expect(goalkeeper.position.x).toBeLessThanOrEqual(GOAL_HALF_WIDTH - goalkeeper.radius);
    expect(goalkeeper.position.z).toBeCloseTo(GOALKEEPER_GUARD_Z);
    expect(goalkeeper.hitPoints).toBe(16);
  });

  it('applies the halftime Pace multiplier to ordinary movement', () => {
    const baseline = createGameState();
    const boosted = createGameState();
    updatePlayer(baseline, { x: 1, z: 0 }, 0, 1, 1);
    updatePlayer(boosted, { x: 1, z: 0 }, 0, 1, 1.15);

    expect(boosted.player.position.x).toBeGreaterThan(baseline.player.position.x);
  });

  it('applies a bounded dash cooldown multiplier independently of movement speed', () => {
    const baseline = createGameState();
    const quickRecovery = createGameState();

    updatePlayer(baseline, { x: 1, z: 0, dash: true }, 0, 0, 1, 1);
    updatePlayer(quickRecovery, { x: 1, z: 0, dash: true }, 0, 0, 1, 0.8);

    expect(baseline.player.dashCooldown).toBeCloseTo(1.35);
    expect(quickRecovery.player.dashCooldown).toBeCloseTo(1.08);
  });

  it('reduces enemy contact damage with the player damage-taken multiplier', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.spawnTimer = 100;
    const enemy = spawnGoalkeeperGuard(state);
    enemy.position = { ...state.player.position };
    enemy.previousPosition = { ...enemy.position };
    enemy.attackDamage = 20;

    updateEnemies(
      state,
      0,
      { stage: 'goalOpportunity', stageElapsed: 1, matchElapsed: 90 },
      () => 0.5,
      undefined,
      0.5,
    );

    expect(state.player.health).toBe(90);
  });

  it('applies a bounded secondary damage multiplier before enemy defeat resolution', () => {
    const state = createGameState();
    const enemy = spawnEliteEnemy(state, 'winger', 1);
    enemy.hitPoints = 10;
    enemy.maxHitPoints = 10;

    const result = damageEnemiesWithSecondary(
      state,
      [
        {
          targetId: enemy.id,
          damage: 4,
          source: 'garlic-trail',
          position: enemy.position,
        },
      ],
      undefined,
      1.5,
    );

    expect(result).toMatchObject({ hits: 1, kills: 0 });
    expect(enemy.hitPoints).toBe(4);
  });

  it('holds the ordinary population cap under a dense mixed final-wave crowd', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 600;
    const archetypes = ['bloodFan', 'winger', 'defender', 'coach'] as const;
    for (let index = 0; index < 71; index += 1) {
      const spawned = spawnEliteEnemy(
        state,
        index % 2 === 0 ? 'winger' : 'defender',
        index % 3 === 0 ? -1 : 1,
      );
      spawned.archetype = archetypes[index % archetypes.length]!;
    }
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    expect(state.enemies).toHaveLength(72);
    expect(state.enemies.some((enemy) => enemy.buffed)).toBe(true);

    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    expect(state.enemies).toHaveLength(72);
  });

  it('rests the ordinary spawn director during goal and halftime stages', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.spawnTimer = 0;

    updateEnemies(state, 1, {
      stage: 'goalOpportunity',
      stageElapsed: 2,
      matchElapsed: 100,
    });
    updateEnemies(state, 1, {
      stage: 'halftimeChoice',
      stageElapsed: 2,
      matchElapsed: 200,
    });

    expect(state.enemies).toHaveLength(0);
    expect(state.spawnTimer).toBe(0);
  });

  it('keeps ordinary enemies at full decision fidelity through the near-distance boundary', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.spawnTimer = 100;
    state.player.position = { x: 0, y: 0.9, z: 0 };
    const fan = spawnEliteEnemy(state, 'winger', 1);
    fan.archetype = 'bloodFan';
    fan.position = { x: 10, y: 0.9, z: 0 };
    fan.previousPosition = { ...fan.position };
    const coach = spawnEliteEnemy(state, 'winger', 1);
    coach.archetype = 'coach';
    coach.position = { x: 10, y: 0.98, z: 0.5 };
    coach.previousPosition = { ...coach.position };

    updateEnemies(state, 1 / 60);

    expect(fan.buffed).toBe(true);
  });

  it('stagger-refreshes far ordinary decisions without stalling chase movement', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.spawnTimer = 100;
    state.player.position = { x: 0, y: 0.9, z: 0 };
    const fan = spawnEliteEnemy(state, 'winger', 1);
    fan.archetype = 'bloodFan';
    fan.position = { x: 15, y: 0.9, z: 0 };
    fan.previousPosition = { ...fan.position };
    const coach = spawnEliteEnemy(state, 'winger', 1);
    coach.archetype = 'coach';
    coach.position = { x: 15, y: 0.98, z: 0.5 };
    coach.previousPosition = { ...coach.position };
    const positions: number[] = [];

    updateEnemies(state, 1 / 60);
    positions.push(fan.position.x);
    expect(fan.buffed).toBe(false);
    updateEnemies(state, 1 / 60);
    positions.push(fan.position.x);
    expect(fan.buffed).toBe(false);
    updateEnemies(state, 1 / 60);
    positions.push(fan.position.x);

    expect(fan.buffed).toBe(true);
    expect(positions[0]).toBeLessThan(15);
    expect(positions[1]).toBeLessThan(positions[0]!);
    expect(positions[2]).toBeLessThan(positions[1]!);
  });

  it('keeps far special attackers on full-rate coach and separation decisions', () => {
    const state = createGameState();
    state.phase = 'playing';
    state.spawnTimer = 100;
    state.player.position = { x: 0, y: 0.9, z: 0 };
    const winger = spawnEliteEnemy(state, 'winger', 1);
    winger.position = { x: 15, y: 0.82, z: 0 };
    winger.previousPosition = { ...winger.position };
    const coach = spawnEliteEnemy(state, 'winger', 1);
    coach.archetype = 'coach';
    coach.position = { x: 15, y: 0.98, z: 0.5 };
    coach.previousPosition = { ...coach.position };

    updateEnemies(state, 1 / 60);

    expect(winger.buffed).toBe(true);
  });

  it('unlocks fragile bat swarms in the later enemy mix', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 60;
    state.spawnTimer = 0;

    updateEnemies(state, 1 / 60);

    const swarm = state.enemies.at(-1);
    expect(swarm).toMatchObject({
      archetype: 'batSwarm',
      radius: 0.38,
      attackDamage: 8,
      hitPoints: 1,
      maxHitPoints: 1,
    });
    expect(swarm!.speed).toBeGreaterThan(4);
    expect(swarm!.position.y).toBe(1.25);
  });

  it('gives bat swarms a deterministic lateral weave while pursuing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const states = [createGameState(), createGameState()];
    for (const state of states) {
      state.phase = 'playing';
      state.elapsed = 60;
      state.spawnTimer = 0;
      updateEnemies(state, 1 / 60);
      const swarm = state.enemies[0]!;
      swarm.position = { x: 0, y: 1.25, z: -8 };
      swarm.previousPosition = { ...swarm.position };
      state.player.position = { x: 0, y: 0.9, z: 5 };
      state.spawnTimer = 100;
      updateEnemies(state, 0.1);
    }

    const firstSwarm = states[0]!.enemies[0]!;
    const secondSwarm = states[1]!.enemies[0]!;
    expect(firstSwarm.position.z).toBeGreaterThan(-8);
    expect(Math.abs(firstSwarm.position.x)).toBeGreaterThan(0.01);
    expect(firstSwarm.position).toEqual(secondSwarm.position);
  });

  it('unlocks durable leech strikers in the advanced enemy mix', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 120;
    state.spawnTimer = 0;

    updateEnemies(state, 1 / 60);

    expect(state.enemies.at(-1)).toMatchObject({
      archetype: 'leechStriker',
      radius: 0.48,
      attackDamage: 4,
      hitPoints: 3,
      maxHitPoints: 3,
    });
  });

  it('latches to drain health in pulses and sustain itself', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 120;
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    const striker = state.enemies[0]!;
    striker.position = { ...state.player.position };
    striker.previousPosition = { ...striker.position };
    striker.hitPoints = 1;
    state.spawnTimer = 100;

    updateEnemies(state, 0.01);

    expect(striker.attackState).toBe('drain');
    expect(striker.position).toEqual(striker.previousPosition);
    expect(striker.hitPoints).toBe(2);
    expect(state.player.health).toBe(96);
    expect(state.player.invulnerability).toBe(0.18);

    state.player.invulnerability = 0;
    updateEnemies(state, 0.2);
    expect(striker.hitPoints).toBe(3);
    expect(state.player.health).toBe(92);
  });

  it('keeps closing when a leech striker is just outside contact range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 120;
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    const striker = state.enemies[0]!;
    striker.position = { x: state.player.position.x + 1.07, y: 0.94, z: state.player.position.z };
    striker.previousPosition = { ...striker.position };
    state.spawnTimer = 100;

    updateEnemies(state, 0.01);

    expect(striker.attackState).toBe('chase');
    expect(striker.position.x).toBeLessThan(state.player.position.x + 1.07);
    expect(state.player.health).toBe(100);
  });

  it('unlocks corrupt referees in the late-match enemy mix', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 180;
    state.spawnTimer = 0;

    updateEnemies(state, 1 / 60);

    expect(state.enemies.at(-1)).toMatchObject({
      archetype: 'corruptReferee',
      radius: 0.55,
      attackDamage: 6,
      hitPoints: 3,
      maxHitPoints: 3,
    });
  });

  it('telegraphs and applies exactly one ranged whistle disruption', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 180;
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    const referee = state.enemies[0]!;
    referee.position = { x: state.player.position.x + 6, y: 0.98, z: state.player.position.z };
    referee.previousPosition = { ...referee.position };
    state.spawnTimer = 100;

    updateEnemies(state, 0.01);
    expect(referee.attackState).toBe('telegraph');
    expect(referee.position).toEqual(referee.previousPosition);
    expect(state.player.health).toBe(100);

    updateEnemies(state, 0.65);
    expect(referee.attackState).toBe('whistle');
    expect(state.player.health).toBe(94);
    expect(state.player.invulnerability).toBe(0.45);

    state.player.invulnerability = 0;
    updateEnemies(state, 0.01);
    expect(state.player.health).toBe(94);
  });

  it('keeps closing immediately beyond the referee whistle boundary', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 180;
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    const referee = state.enemies[0]!;
    referee.position = { x: state.player.position.x + 6.51, y: 0.98, z: state.player.position.z };
    referee.previousPosition = { ...referee.position };
    state.spawnTimer = 100;

    updateEnemies(state, 0.01);

    expect(referee.attackState).toBe('chase');
    expect(referee.position.x).toBeLessThan(state.player.position.x + 6.51);
    expect(state.player.health).toBe(100);
  });

  it('retreats to preserve standoff distance while its whistle is cooling down', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 180;
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    const referee = state.enemies[0]!;
    referee.position = { x: state.player.position.x + 4, y: 0.98, z: state.player.position.z };
    referee.previousPosition = { ...referee.position };
    referee.attackCooldown = 1;
    state.spawnTimer = 100;

    updateEnemies(state, 0.1);

    expect(referee.attackState).toBe('chase');
    expect(referee.position.x).toBeGreaterThan(state.player.position.x + 4);
  });

  it('unlocks slow durable goalkeeper brutes in the final enemy mix', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 240;
    state.spawnTimer = 0;

    updateEnemies(state, 1 / 60);

    const brute = state.enemies.at(-1);
    expect(brute).toMatchObject({
      archetype: 'goalkeeperBrute',
      radius: 0.92,
      attackDamage: 28,
      hitPoints: 8,
      maxHitPoints: 8,
    });
    expect(brute!.speed).toBeLessThan(1.2);
  });

  it('catches shots through the exact power-shot boundary', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const state = createGameState();
    state.phase = 'playing';
    state.elapsed = 240;
    state.spawnTimer = 0;
    updateEnemies(state, 1 / 60);
    const brute = state.enemies[0]!;
    brute.position = { x: 0, y: 1.18, z: 0 };
    brute.previousPosition = { ...brute.position };
    const ball = { x: 0, y: 0.75, z: 0 };
    const ballVelocity = { x: 17, y: 0, z: 0 };

    const caught = damageEnemiesWithBall(state, ball, 17, 1, ballVelocity);

    expect(caught).toMatchObject({
      hits: 1,
      kills: 0,
      blockedHits: 1,
      rebound: { enemyId: brute.id, velocityMultiplier: 0.45 },
    });
    expect(brute.hitPoints).toBe(8);
    expect(brute.knockbackVelocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(brute.shieldFlash).toBe(0.28);

    brute.lastBallHit = 0;
    const powered = damageEnemiesWithBall(state, ball, 17.01, 1, ballVelocity);
    expect(powered.blockedHits).toBe(0);
    expect(powered.rebound).toBeUndefined();
    expect(brute.hitPoints).toBe(6);
    expect(brute.knockbackVelocity.x).toBeGreaterThan(0);
  });

  it('applies the strongest active frost slow with bounded duration', () => {
    const state = createGameState();
    const enemy = spawnEliteEnemy(state, 'winger', 1);

    expect(applyEnemySlow(state, enemy.id, 0.7, 2)).toBe(true);
    expect(applyEnemySlow(state, enemy.id, 0.9, 9)).toBe(true);
    expect(enemy.slowSpeedMultiplier).toBe(0.7);
    expect(enemy.slowTimer).toBe(6);
    expect(applyEnemySlow(state, 999_999, 0.5, 1)).toBe(false);
  });
});
