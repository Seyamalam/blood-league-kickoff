import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PITCH_HALF_LENGTH } from '../../game/field';
import type { PlayerState } from '../../game/simulation/types';
import { CharacterReadabilityLight } from './CharacterReadabilityLight';
import { CombatVfxPool } from './CombatVfxPool';
import { GoalNetResponse } from './GoalNetResponse';
import { PitchSurfaceEffects } from './PitchSurfaceEffects';
import { createStadium } from './createStadium';

describe('render-only presentation polish', () => {
  it('keeps layered combat accents in a fixed quality-aware pool', () => {
    const scene = new THREE.Scene();
    const effects = new CombatVfxPool(scene);

    effects.setQuality('performance');
    for (let index = 0; index < 30; index += 1) {
      effects.trigger(index % 2 ? 'goal' : 'boss', { x: index, y: 0.2, z: 0 }, 1.4);
    }

    expect(scene.getObjectsByProperty('name', 'signature-vfx-beam')).toHaveLength(6);
    expect(scene.children.filter((child) => child.name.startsWith('pooled-signature-vfx-'))).toHaveLength(6);
    expect(scene.getObjectByName('signature-vfx-beam')?.visible).toBe(false);
    effects.update(2);
    expect(scene.children.filter((child) => child.name.startsWith('pooled-signature-vfx-'))).toHaveLength(6);
    effects.dispose();
  });

  it('reuses bounded instanced pools for footprints, skids, slides, and rain contacts', () => {
    const scene = new THREE.Scene();
    createStadium(scene, 'moonlit-classic');
    const effects = new PitchSurfaceEffects(scene);
    const player = createPlayer();

    effects.sync(player, { x: 0, y: 0.3, z: 0 }, 12, 0.1);
    player.position = { x: 0, y: 0, z: 2 };
    player.dashTime = 0.1;
    effects.sync(player, { x: 0, y: 0.3, z: 2 }, 12, 0.1);
    effects.markTackle(player.position, 0, 1.2);

    expect((scene.getObjectByName('pitch-footprint-pool') as THREE.InstancedMesh).count).toBe(24);
    expect((scene.getObjectByName('pitch-ball-skid-pool') as THREE.InstancedMesh).count).toBe(18);
    expect((scene.getObjectByName('pitch-slide-trail-pool') as THREE.InstancedMesh).count).toBe(12);
    expect((scene.getObjectByName('pitch-rain-splash-pool') as THREE.InstancedMesh).count).toBe(16);
    effects.dispose();
  });

  it('ripples and restores the existing goal net after an impact', () => {
    const scene = new THREE.Scene();
    createStadium(scene, 'blood-court');
    const response = new GoalNetResponse(scene);
    const net = scene.getObjectByName('opponent-goal')!.getObjectByName('goal-net') as THREE.LineSegments;
    const positions = net.geometry.getAttribute('position') as THREE.BufferAttribute;
    const before = Array.from(positions.array as ArrayLike<number>);

    response.impact({ x: 0, y: 1.3, z: -PITCH_HALF_LENGTH }, 1.5);
    response.update(1 / 30);
    expect(Array.from(positions.array as ArrayLike<number>)).not.toEqual(before);
    response.reset();
    expect(Array.from(positions.array as ArrayLike<number>)).toEqual(before);
    response.dispose();
  });

  it('adapts the shadow-free hero fill to rebuilt stadium palettes', () => {
    const scene = new THREE.Scene();
    createStadium(scene, 'blood-court');
    const readability = new CharacterReadabilityLight(scene);
    readability.update({ x: 2, y: 0, z: -3 });
    const light = scene.getObjectByName('player-readability-light') as THREE.PointLight;
    const firstColor = light.color.getHex();

    createStadium(scene, 'frostbound-arena');
    readability.update({ x: 4, y: 0, z: 5 });
    expect(light.color.getHex()).not.toBe(firstColor);
    expect(light.position.toArray()).toEqual([4, 2.35, 5.8]);
    expect(light.castShadow).toBe(false);
    readability.dispose();
  });
});

function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    previousPosition: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: 0,
    health: 100,
    maxHealth: 100,
    invulnerability: 0,
    dashCooldown: 0,
    dashTime: 0,
    dashDirection: { x: 0, y: 0, z: 1 },
  };
}
