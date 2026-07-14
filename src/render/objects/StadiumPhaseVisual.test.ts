import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { StadiumPhaseVisual } from './StadiumPhaseVisual';

describe('StadiumPhaseVisual', () => {
  it('reveals the Blood Moon transformation and resets cleanly', () => {
    const scene = new THREE.Scene();
    const visual = new StadiumPhaseVisual(scene);
    visual.setPhase('bloodMoon');
    for (let index = 0; index < 60; index += 1) visual.update(1 / 60);

    expect(visual.currentStage).toBe('bloodMoon');
    expect(scene.getObjectByName('stadium-phase-visual')?.visible).toBe(true);
    expect(scene.getObjectByName('stadium-blood-moon')?.visible).toBe(true);
    expect(scene.getObjectByName('stadium-blood-runes')?.visible).toBe(true);

    visual.reset();
    expect(visual.currentStage).toBe('opening');
    expect(scene.getObjectByName('stadium-phase-visual')?.visible).toBe(false);
  });

  it('removes its group and disposes unique resources once', () => {
    const scene = new THREE.Scene();
    const visual = new StadiumPhaseVisual(scene);
    const group = scene.getObjectByName('stadium-phase-visual')!;
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

    expect(scene.getObjectByName('stadium-phase-visual')).toBeUndefined();
    geometrySpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
    materialSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });
});
