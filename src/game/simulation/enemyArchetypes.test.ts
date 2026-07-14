import { describe, expect, it } from 'vitest';
import { createGameState, spawnEnemyAt } from './gameState';
import { ENEMY_ARCHETYPE_DEFINITIONS } from './enemyArchetypes';
import type { EnemyArchetype } from './types';

const ARCHETYPES = Object.keys(ENEMY_ARCHETYPE_DEFINITIONS) as EnemyArchetype[];

describe('enemy archetype definitions', () => {
  it('provides complete, immutable presentation metadata for the roster', () => {
    expect(ARCHETYPES).toHaveLength(11);
    expect(new Set(Object.values(ENEMY_ARCHETYPE_DEFINITIONS).map(({ role }) => role))).toEqual(
      new Set([
        'swarm',
        'sprinter',
        'tank',
        'summoner',
        'healer',
        'controller',
        'ranged',
        'assassin',
        'exploder',
        'goalDefender',
      ]),
    );
    for (const [archetype, definition] of Object.entries(ENEMY_ARCHETYPE_DEFINITIONS)) {
      expect(definition.archetype).toBe(archetype);
      expect(definition.displayName.length).toBeGreaterThan(3);
      expect(definition.signature.length).toBeGreaterThan(3);
      expect(definition.threatLevel).toBeGreaterThanOrEqual(1);
      expect(definition.threatLevel).toBeLessThanOrEqual(5);
      expect(Object.isFrozen(definition)).toBe(true);
    }
  });

  it.each(ARCHETYPES)('stamps %s role metadata onto spawned simulation state', (archetype) => {
    const game = createGameState();
    const enemy = spawnEnemyAt(game, archetype, { x: 0, y: 1, z: 0 });
    expect(enemy.role).toBe(ENEMY_ARCHETYPE_DEFINITIONS[archetype].role);
  });
});
