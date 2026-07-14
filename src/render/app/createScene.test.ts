import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyStadiumSelection, createScene } from './createScene';

describe('arena lighting', () => {
  it('adds a shadow-free gameplay fill while retaining one shadow-casting key', () => {
    const scene = createScene();
    const lights: THREE.Light[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Light) lights.push(object);
    });

    const moon = scene.getObjectByName('arena-moon-key-light');
    const fill = scene.getObjectByName('arena-gameplay-fill-light');
    const ambient = scene.getObjectByName('arena-ambient-light');
    const bloodGoal = scene.getObjectByName('arena-blood-goal-light');

    expect(lights).toHaveLength(4);
    expect(moon).toBeInstanceOf(THREE.DirectionalLight);
    expect(moon?.castShadow).toBe(true);
    expect(fill).toBeInstanceOf(THREE.DirectionalLight);
    expect(fill?.castShadow).toBe(false);
    expect(ambient).toBeInstanceOf(THREE.HemisphereLight);
    expect(bloodGoal).toBeInstanceOf(THREE.PointLight);
    expect(bloodGoal?.castShadow).toBe(false);
    expect(lights.filter((light) => light.castShadow)).toEqual([moon]);
  });

  it('applies an arena palette and architecture without replacing gameplay lights', () => {
    const scene = createScene('moonlit-classic');
    const moon = scene.getObjectByName('arena-moon-key-light');
    const stadium = scene.getObjectByName('stadium-environment');

    expect(stadium?.userData.variantId).toBe('moonlit-classic');
    expect(applyStadiumSelection(scene, 'royal-amethyst')).toBe('royal-amethyst');
    expect(scene.getObjectByName('stadium-environment')?.userData.variantId).toBe('royal-amethyst');
    expect(scene.getObjectByName('stadium-architecture-colosseum')).toBeInstanceOf(THREE.Group);
    expect(scene.getObjectByName('arena-moon-key-light')).toBe(moon);
    expect((scene.background as THREE.Color).getHex()).toBe(0x10071a);
  });
});
