import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { spawnCountGoalkeeper } from '../../game/boss';
import { CountGoalkeeperVisual } from './CountGoalkeeperVisual';

describe('CountGoalkeeperVisual', () => {
  it('reveals the second-form silhouette during desperation', () => {
    const scene = new THREE.Scene();
    const visual = new CountGoalkeeperVisual(scene);
    const state = { ...spawnCountGoalkeeper(), phase: 'desperation' as const, phaseElapsed: 3 };

    for (let index = 0; index < 24; index += 1) visual.sync(state, 1);

    expect(scene.getObjectByName('count-goalkeeper-wing-left')?.visible).toBe(true);
    expect(scene.getObjectByName('count-goalkeeper-wing-right')?.visible).toBe(true);
    expect(scene.getObjectByName('count-goalkeeper-blood-cape')?.visible).toBe(true);
    expect(scene.getObjectByName('count-goalkeeper-blood-halo')?.visible).toBe(true);
  });

  it('removes and disposes every owned render resource', () => {
    const scene = new THREE.Scene();
    const visual = new CountGoalkeeperVisual(scene);
    const group = scene.getObjectByName('count-goalkeeper-visual')!;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const entries = Array.isArray(object.material) ? object.material : [object.material];
      entries.forEach((material) => materials.add(material));
    });
    const geometrySpies = [...geometries].map((resource) => vi.spyOn(resource, 'dispose'));
    const materialSpies = [...materials].map((resource) => vi.spyOn(resource, 'dispose'));

    visual.dispose();

    expect(scene.getObjectByName('count-goalkeeper-visual')).toBeUndefined();
    geometrySpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
    materialSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });
});
