import { describe, expect, it } from 'vitest';
import { PLAYABLE_HALF_LENGTH, PLAYABLE_HALF_WIDTH } from '../field';
import { createGameState } from '../simulation/gameState';
import { ENEMY_FORMATIONS, spawnEnemyFormation } from './formations';

describe('authored enemy formations', () => {
  it('spawns every authored slot and returns elite bindings', () => {
    const state = createGameState();
    const result = spawnEnemyFormation(state, 'penaltyBoxAmbush', { x: 0, y: 0.9, z: -30 }, 1);

    expect(result.enemies).toHaveLength(ENEMY_FORMATIONS.penaltyBoxAmbush.slots.length);
    expect(result.eliteBindings).toHaveLength(1);
    expect(result.enemies.some((enemy) => enemy.archetype === 'goalkeeperBrute')).toBe(true);
    expect(state.enemies).toHaveLength(result.enemies.length);
  });

  it('mirrors and clamps slots to the playable field', () => {
    const state = createGameState();
    const result = spawnEnemyFormation(
      state,
      'pitchInvasion',
      { x: PLAYABLE_HALF_WIDTH, y: 0.9, z: PLAYABLE_HALF_LENGTH },
      -1,
    );

    for (const enemy of result.enemies) {
      expect(Math.abs(enemy.position.x)).toBeLessThanOrEqual(PLAYABLE_HALF_WIDTH);
      expect(Math.abs(enemy.position.z)).toBeLessThanOrEqual(PLAYABLE_HALF_LENGTH);
    }
  });
});
