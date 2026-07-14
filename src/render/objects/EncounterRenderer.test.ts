import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { spawnMiniboss } from '../../game/boss';
import { applyEliteModifier, createEnvironmentInteraction } from '../../game/encounters';
import { createGameState, spawnEnemyAt } from '../../game/simulation/gameState';
import { EncounterRenderer } from './EncounterRenderer';

describe('encounter renderer', () => {
  it('presents affixes, interactions, and both miniboss identities', () => {
    const scene = new THREE.Scene();
    const renderer = new EncounterRenderer(scene);
    const game = createGameState();
    const enemy = spawnEnemyAt(game, 'defender', { x: 2, y: 1, z: 3 });
    const binding = applyEliteModifier(enemy, 'armored');
    const barrel = createEnvironmentInteraction(1, 'bloodBarrel', { x: -2, y: 0, z: 3 });
    const captain = spawnMiniboss('crimsonCaptain', 90);

    renderer.sync([binding], game.enemies, captain, [barrel], 1, 0.5);

    expect(scene.getObjectByName(`elite-affix-armored-${enemy.id}`)).toBeDefined();
    expect(scene.getObjectByName('environment-bloodBarrel-1')).toBeDefined();
    expect(scene.getObjectByName('miniboss-crimsonCaptain')?.visible).toBe(true);
    expect(scene.getObjectByName('miniboss-graveyardPlaymaker')?.visible).toBe(false);
    renderer.dispose();
  });
});
