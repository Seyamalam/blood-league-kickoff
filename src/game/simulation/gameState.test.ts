import { describe, expect, it } from 'vitest';
import {
  createGameState,
  resetKickoffFormation,
  spawnEliteEnemy,
  updatePlayer,
} from './gameState';

describe('game state match helpers', () => {
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
});
