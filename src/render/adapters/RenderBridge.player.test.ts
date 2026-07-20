import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '../../game/characters';
import { RenderBridge } from './RenderBridge';

function playerRoot(scene: THREE.Scene): THREE.Group {
  const player = scene.getObjectByName('player-striker');
  expect(player).toBeInstanceOf(THREE.Group);
  return player as THREE.Group;
}

function playerMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  playerRoot(scene).traverse((child) => {
    if (child instanceof THREE.Mesh && child.name !== 'elite-marker') result.push(child);
  });
  return result;
}

describe('RenderBridge player visual', () => {
  it('builds an articulated original voxel athlete with six shared-rig identities', () => {
    const scene = new THREE.Scene();
    const bridge = new RenderBridge(scene);
    const player = playerRoot(scene);
    const meshes = playerMeshes(scene);

    expect(player.userData.visualStyle).toBe('original-block-football');
    expect(player.userData.rigType).toBe('voxel-humanoid-v1');
    expect(player.getObjectByName('player-root')?.userData.sharedSkeleton).toBe(true);
    for (const joint of [
      'player-pelvis',
      'player-torso',
      'player-head',
      'player-left-upper-arm',
      'player-right-lower-arm',
      'player-left-upper-leg',
      'player-right-lower-leg',
      'player-left-foot',
      'player-right-foot',
    ]) {
      expect(player.getObjectByName(joint), `${joint} should exist`).toBeInstanceOf(THREE.Group);
    }

    const anatomy = meshes.filter((mesh) => mesh.name.startsWith('player-'));
    expect(anatomy.length).toBeGreaterThanOrEqual(24);
    expect(anatomy.every((mesh) => mesh.geometry instanceof THREE.BoxGeometry)).toBe(true);
    for (const id of CHARACTER_IDS) {
      expect(player.getObjectByName(`player-accessory-${id}`)).toBeInstanceOf(THREE.Group);
    }

    bridge.setCharacter('tower');
    expect(player.getObjectByName('player-accessory-tower')?.visible).toBe(true);
    expect(player.getObjectByName('player-accessory-maestro')?.visible).toBe(false);
    expect(player.getObjectByName('player-variant-tower-shoulder-left')).toBeInstanceOf(THREE.Mesh);
    expect(player.getObjectByName('player-root')!.scale.x).toBeGreaterThan(1);
    bridge.dispose();
  });

  it('keeps two player rigs visually independent while sharing cached box geometry', () => {
    const firstScene = new THREE.Scene();
    const secondScene = new THREE.Scene();
    const firstBridge = new RenderBridge(firstScene);
    const secondBridge = new RenderBridge(secondScene);
    const firstTorso = firstScene.getObjectByName('player-torso-mesh') as THREE.Mesh;
    const secondTorso = secondScene.getObjectByName('player-torso-mesh') as THREE.Mesh;

    expect(firstTorso.geometry).toBe(secondTorso.geometry);
    expect(firstTorso.material).toBe(secondTorso.material);
    firstBridge.setCharacter('breakaway');
    expect((firstTorso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xd9e4ef);
    expect((secondTorso.material as THREE.MeshStandardMaterial).color.getHex()).not.toBe(0xd9e4ef);

    firstBridge.dispose();
    secondBridge.dispose();
  });
});
