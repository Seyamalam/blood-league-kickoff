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
    const captainVisual = scene.getObjectByName('miniboss-crimsonCaptain')!;
    expect(captainVisual.userData.minibossRole).toBe('juggernaut');
    expect(captainVisual.getObjectByName('captain-armband')).toBeInstanceOf(THREE.Mesh);
    expect(captainVisual.getObjectByName('captain-charge-horn')).toBeInstanceOf(THREE.Mesh);

    const playmaker = spawnMiniboss('graveyardPlaymaker', 91);
    renderer.sync([], [], playmaker, [], 2, 1);
    const playmakerVisual = scene.getObjectByName('miniboss-graveyardPlaymaker')!;
    expect(playmakerVisual.visible).toBe(true);
    expect(playmakerVisual.userData.minibossRole).toBe('summoner');
    expect(playmakerVisual.getObjectByName('playmaker-orbit')).toBeInstanceOf(THREE.Group);
    expect(playmakerVisual.getObjectByName('playmaker-staff')).toBeInstanceOf(THREE.Mesh);
    renderer.dispose();
  });

  it('renders a reusable momentum gate and visibly cools it down after activation', () => {
    const scene = new THREE.Scene();
    const renderer = new EncounterRenderer(scene);
    const gate = createEnvironmentInteraction(77, 'momentumGate', { x: 5, y: 0, z: -3 });

    renderer.sync([], [], null, [gate], 1, 1);
    const visual = scene.getObjectByName('environment-momentumGate-77');
    expect(visual).toBeInstanceOf(THREE.Group);
    expect(visual?.getObjectByName('momentum-gate-arrow')).toBeInstanceOf(THREE.Mesh);

    gate.pulseTimer = 4;
    renderer.sync([], [], null, [gate], 2, 1);
    expect(visual?.scale.x).toBeCloseTo(0.82);

    renderer.dispose();
    expect(scene.getObjectByName('environment-momentumGate-77')).toBeUndefined();
  });
});
