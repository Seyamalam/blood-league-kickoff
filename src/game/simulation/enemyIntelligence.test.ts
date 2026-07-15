import { describe, expect, it } from 'vitest';
import { createGameState, spawnEliteEnemy, spawnEnemyAt, updateEnemies } from './gameState';
import { buildEnemySquadBlackboard, resolveEnemySquadIntent } from './enemyIntelligence';

describe('enemy squad intelligence', () => {
  it('selects the highest-priority living support with stable id tie-breaking', () => {
    const state = createGameState();
    const coach = spawnEnemyAt(state, 'coach', { x: 1, y: 1, z: 2 });
    const laterArcher = spawnEnemyAt(state, 'bloodArcher', { x: 3, y: 1, z: 4 });
    const earlierArcher = spawnEnemyAt(state, 'bloodArcher', { x: -3, y: 1, z: 4 });
    laterArcher.id = 90;
    earlierArcher.id = 12;

    const board = buildEnemySquadBlackboard(state.enemies, state.player);

    expect(board.hasCommander).toBe(true);
    expect(board.protectedSupport).toBe(earlierArcher);
    expect(board.protectedSupport).not.toBe(coach);
  });

  it('positions defenders between the player and a ranged support', () => {
    const state = createGameState();
    state.player.position = { x: 0, y: 0.9, z: 0 };
    const archer = spawnEnemyAt(state, 'bloodArcher', { x: 0, y: 1, z: 10 });
    const defender = spawnEnemyAt(state, 'defender', { x: 8, y: 1, z: 10 });

    const intent = resolveEnemySquadIntent(buildEnemySquadBlackboard(state.enemies, state.player), defender);

    expect(intent.tactic).toBe('screen');
    expect(intent.targetX).toBeCloseTo(archer.position.x);
    expect(intent.targetZ).toBeCloseTo(7.8);
  });

  it('assigns stable opposite flanks and gives elite wingers a committed pace bonus', () => {
    const state = createGameState();
    state.player.position = { x: 0, y: 0.9, z: 0 };
    const left = spawnEnemyAt(state, 'winger', { x: -10, y: 1, z: 0 });
    const right = spawnEnemyAt(state, 'winger', { x: 10, y: 1, z: 0 });
    spawnEnemyAt(state, 'bloodFan', { x: 0, y: 1, z: 12 });
    left.elite = true;
    const board = buildEnemySquadBlackboard(state.enemies, state.player);

    const first = resolveEnemySquadIntent(board, left);
    const repeated = resolveEnemySquadIntent(board, left);
    const opposite = resolveEnemySquadIntent(board, right);

    expect(first).toEqual(repeated);
    expect(first.tactic).toBe('flank');
    expect(first.speedMultiplier).toBe(1.12);
    expect(Math.sign(first.targetX)).not.toBe(Math.sign(opposite.targetX));
  });

  it('uses coach-led stable encirclement slots for basic pressure units', () => {
    const state = createGameState();
    state.player.position = { x: 4, y: 0.9, z: -2 };
    spawnEnemyAt(state, 'coach', { x: 9, y: 1, z: 9 });
    const firstFan = spawnEnemyAt(state, 'bloodFan', { x: -8, y: 1, z: 8 });
    const secondFan = spawnEnemyAt(state, 'bloodFan', { x: 8, y: 1, z: 8 });
    const board = buildEnemySquadBlackboard(state.enemies, state.player);

    const first = resolveEnemySquadIntent(board, firstFan);
    const second = resolveEnemySquadIntent(board, secondFan);

    expect(first.tactic).toBe('encircle');
    expect(second.tactic).toBe('encircle');
    expect(first.targetX).not.toBeCloseTo(second.targetX);
    expect(Math.hypot(first.targetX - 4, first.targetZ + 2)).toBeCloseTo(1.7);
  });

  it('lets immediate attacks and goalkeeper authority override formation tactics', () => {
    const state = createGameState();
    state.player.position = { x: 0, y: 0.9, z: 0 };
    const elite = spawnEliteEnemy(state, 'winger', 1);
    elite.attackState = 'telegraph';
    const goalkeeper = spawnEnemyAt(state, 'goalkeeperBrute', { x: 4, y: 1, z: 8 });
    goalkeeper.goalkeeper = true;
    const board = buildEnemySquadBlackboard(state.enemies, state.player);

    expect(resolveEnemySquadIntent(board, elite).tactic).toBe('pressure');
    expect(resolveEnemySquadIntent(board, goalkeeper).tactic).toBe('pressure');
  });

  it('integrates deterministic opposite-side flanks into fixed-step movement', () => {
    const createSquad = () => {
      const state = createGameState();
      state.phase = 'playing' as const;
      state.spawnTimer = 100;
      state.player.position = { x: 0, y: 0.9, z: 0 };
      const left = spawnEnemyAt(state, 'winger', { x: 0, y: 1, z: 10 });
      const right = spawnEnemyAt(state, 'winger', { x: 0, y: 1, z: 11 });
      spawnEnemyAt(state, 'bloodFan', { x: 0, y: 1, z: 14 });
      left.attackCooldown = 100;
      right.attackCooldown = 100;
      return state;
    };
    const first = createSquad();
    const replay = createSquad();

    for (let tick = 0; tick < 30; tick += 1) {
      updateEnemies(first, 1 / 60);
      updateEnemies(replay, 1 / 60);
    }

    expect(first.enemies.map(({ position }) => position)).toEqual(
      replay.enemies.map(({ position }) => position),
    );
    expect(first.enemies[0]!.position.x).toBeLessThan(0);
    expect(first.enemies[1]!.position.x).toBeGreaterThan(0);
  });
});
