import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGameState,
  resetKickoffFormation,
  spawnEliteEnemy,
  updateEnemies,
  updatePlayer,
} from './gameState';

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

  it('applies the halftime Pace multiplier to ordinary movement', () => {
    const baseline = createGameState();
    const boosted = createGameState();
    updatePlayer(baseline, { x: 1, z: 0 }, 0, 1, 1);
    updatePlayer(boosted, { x: 1, z: 0 }, 0, 1, 1.15);

    expect(boosted.player.position.x).toBeGreaterThan(baseline.player.position.x);
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
});
