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
    expect(scene.getObjectByName('count-goalkeeper-phase-mask')?.visible).toBe(true);
    expect(scene.getObjectByName('count-goalkeeper-blood-tendrils')?.visible).toBe(true);
    expect(scene.getObjectByName('count-goalkeeper-glove-left')).toBeInstanceOf(THREE.Group);
    expect(scene.getObjectByName('count-goalkeeper-glove-right')).toBeInstanceOf(THREE.Group);
    expect(scene.getObjectByName('count-goalkeeper-chest-armor')).toHaveProperty(
      'geometry.type',
      'ExtrudeGeometry',
    );
  });

  it('poses articulated goalkeeper arms for readable action telegraphs', () => {
    const scene = new THREE.Scene();
    const visual = new CountGoalkeeperVisual(scene);
    const state = {
      ...spawnCountGoalkeeper(),
      phase: 'bloodRush' as const,
      action: 'diveTelegraph' as const,
      actionElapsed: 0.2,
      phaseElapsed: 1,
    };

    visual.sync(state, 1);

    const leftArm = scene.getObjectByName('count-goalkeeper-arm-left')!;
    const rightArm = scene.getObjectByName('count-goalkeeper-arm-right')!;
    expect(leftArm.rotation.z).toBeCloseTo(0.85);
    expect(rightArm.rotation.z).toBeCloseTo(-0.85);
    expect(scene.getObjectByName('count-goalkeeper-action-ring')?.visible).toBe(true);
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
