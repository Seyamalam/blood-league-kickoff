import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { RenderBridge } from './RenderBridge';

function playerMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const player = scene.getObjectByName('player-striker');
  expect(player).toBeInstanceOf(THREE.Group);
  return player!.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
}

describe('RenderBridge player visual', () => {
  it('keeps a low-poly forward-readable striker silhouette with bounded shared resources', () => {
    const firstScene = new THREE.Scene();
    const secondScene = new THREE.Scene();
    const firstBridge = new RenderBridge(firstScene);
    const secondBridge = new RenderBridge(secondScene);
    const firstMeshes = playerMeshes(firstScene);
    const secondMeshes = playerMeshes(secondScene);

    expect(firstMeshes).toHaveLength(13);
    expect(new Set(firstMeshes.map((mesh) => mesh.geometry)).size).toBeLessThanOrEqual(11);
    expect(new Set(firstMeshes.map((mesh) => mesh.material)).size).toBeLessThanOrEqual(6);

    const torso = firstScene.getObjectByName('player-torso')!;
    const boot = firstScene.getObjectByName('player-crimson-boot') as THREE.Mesh;
    const toe = firstScene.getObjectByName('player-crimson-boot-toe')!;
    expect(boot.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect((boot.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xb5123f);
    expect(toe.position.z).toBeLessThan(boot.position.z);
    expect(boot.position.z).toBeLessThan(torso.position.z);

    for (let index = 0; index < firstMeshes.length; index += 1) {
      expect(secondMeshes[index]!.geometry).toBe(firstMeshes[index]!.geometry);
      expect(secondMeshes[index]!.material).toBe(firstMeshes[index]!.material);
    }

    const sharedGeometries = [...new Set(firstMeshes.map((mesh) => mesh.geometry))];
    const sharedMaterials = [...new Set(firstMeshes.map((mesh) => mesh.material as THREE.Material))];
    const geometryDisposals = sharedGeometries.map((geometry) => vi.spyOn(geometry, 'dispose'));
    const materialDisposals = sharedMaterials.map((material) => vi.spyOn(material, 'dispose'));

    firstBridge.dispose();
    for (const spy of [...geometryDisposals, ...materialDisposals]) expect(spy).not.toHaveBeenCalled();

    secondBridge.dispose();
    for (const spy of [...geometryDisposals, ...materialDisposals]) expect(spy).toHaveBeenCalledOnce();
  });
});
