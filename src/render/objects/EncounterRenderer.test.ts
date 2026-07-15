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

  it('uses authored football-horror geometry for every field interaction', () => {
    const scene = new THREE.Scene();
    const renderer = new EncounterRenderer(scene);
    const interactions = [
      createEnvironmentInteraction(1, 'bloodBarrel', { x: -3, y: 0, z: 0 }),
      createEnvironmentInteraction(2, 'holyBeacon', { x: -1, y: 0, z: 0 }),
      createEnvironmentInteraction(3, 'breakableBarrier', { x: 1, y: 0, z: 0 }),
      createEnvironmentInteraction(4, 'momentumGate', { x: 3, y: 0, z: 0 }),
    ];

    renderer.sync([], [], null, interactions, 1.5, 1);

    expect(scene.getObjectByName('blood-barrel-vat')).toHaveProperty('geometry.type', 'LatheGeometry');
    expect(scene.getObjectByName('holy-beacon-reliquary')).toHaveProperty('geometry.type', 'LatheGeometry');
    expect(scene.getObjectByName('barrier-broken-slab-left')).toHaveProperty(
      'geometry.type',
      'ExtrudeGeometry',
    );
    expect(scene.getObjectByName('momentum-gate-gothic-arch')).toHaveProperty(
      'geometry.type',
      'TubeGeometry',
    );
    expect(scene.getObjectByName('momentum-gate-football-sigil')).toBeInstanceOf(THREE.Group);

    for (const interaction of interactions) {
      const interactionGroup = scene.getObjectByName(`environment-${interaction.kind}-${interaction.id}`)!;
      const visibleBoxes: THREE.Mesh[] = [];
      interactionGroup.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry instanceof THREE.BoxGeometry) {
          visibleBoxes.push(object);
        }
      });
      expect(visibleBoxes).toHaveLength(0);
    }
    renderer.dispose();
  });

  it('leaves a short vampire-shard reaction when an enemy disappears', () => {
    const scene = new THREE.Scene();
    const renderer = new EncounterRenderer(scene);
    const game = createGameState();
    const enemy = spawnEnemyAt(game, 'bloodFan', { x: 3, y: 1, z: -2 });

    renderer.sync([], game.enemies, null, [], 4, 1);
    renderer.sync([], [], null, [], 4.1, 1);

    const reaction = scene.getObjectByName(`enemy-death-reaction-${enemy.id}`);
    expect(reaction).toBeInstanceOf(THREE.Group);
    expect(reaction?.userData.presentationRole).toBe('enemy-death-reaction');
    renderer.sync([], [], null, [], 5, 1);
    expect(scene.getObjectByName(`enemy-death-reaction-${enemy.id}`)).toBeUndefined();
    renderer.dispose();
  });

  it('rises minibosses into play and preserves a readable defeat pose after removal', () => {
    const scene = new THREE.Scene();
    const renderer = new EncounterRenderer(scene);
    const captain = spawnMiniboss('crimsonCaptain', 90);

    renderer.sync([], [], captain, [], 2, 1);
    const visual = scene.getObjectByName('miniboss-crimsonCaptain')!;
    expect(visual.position.y).toBeLessThan(0);
    expect(visual.userData.presentationState).toBe('entrance');

    renderer.sync([], [], null, [], 2.1, 1);
    expect(visual.visible).toBe(true);
    expect(visual.userData.presentationState).toBe('defeat');
    renderer.sync([], [], null, [], 4, 1);
    expect(visual.visible).toBe(false);
    renderer.dispose();
  });
});
