import { describe, expect, it } from 'vitest';
import { createGameState, spawnEnemyAt } from '../simulation/gameState';
import { applyEliteModifier, selectEliteModifier, updateEliteModifiers } from './eliteModifiers';

describe('elite modifiers', () => {
  it('applies distinct one-time stat packages', () => {
    const state = createGameState();
    const armored = spawnEnemyAt(state, 'defender', { x: 0, y: 1, z: 0 });
    const originalHealth = armored.maxHitPoints;
    const binding = applyEliteModifier(armored, 'armored');

    expect(armored.elite).toBe(true);
    expect(armored.maxHitPoints).toBeGreaterThan(originalHealth);
    expect(binding).toMatchObject({ enemyId: armored.id, modifierId: 'armored' });
  });

  it('regenerates wounded elites on a fixed pulse', () => {
    const state = createGameState();
    const enemy = spawnEnemyAt(state, 'coach', { x: 0, y: 1, z: 0 });
    const bindings = [applyEliteModifier(enemy, 'regenerating')];
    enemy.hitPoints -= 2;

    expect(updateEliteModifiers(bindings, state.enemies, 0.5)).toHaveLength(0);
    const events = updateEliteModifiers(bindings, state.enemies, 0.5);

    expect(events).toContainEqual(expect.objectContaining({ type: 'regenerated', enemyId: enemy.id }));
    expect(enemy.hitPoints).toBeGreaterThan(enemy.maxHitPoints - 2);
  });

  it('emits one death explosion after an explosive elite is removed', () => {
    const state = createGameState();
    const enemy = spawnEnemyAt(state, 'winger', { x: 4, y: 1, z: -2 });
    const bindings = [applyEliteModifier(enemy, 'explosive')];
    state.enemies.length = 0;

    const events = updateEliteModifiers(bindings, state.enemies, 0.1);

    expect(events).toEqual([
      expect.objectContaining({
        type: 'deathExplosion',
        enemyId: enemy.id,
        position: { x: 4, y: 1, z: -2 },
      }),
    ]);
    expect(bindings).toHaveLength(0);
    expect(updateEliteModifiers(bindings, state.enemies, 0.1)).toHaveLength(0);
  });

  it('selects all five affixes across the normalized roll', () => {
    expect([0, 0.2, 0.4, 0.6, 0.8].map(selectEliteModifier)).toEqual([
      'armored',
      'frenzied',
      'regenerating',
      'explosive',
      'possessed',
    ]);
  });
});
