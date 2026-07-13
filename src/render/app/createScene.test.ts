import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createScene } from './createScene';

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

    expect(lights).toHaveLength(4);
    expect(moon).toBeInstanceOf(THREE.DirectionalLight);
    expect(moon?.castShadow).toBe(true);
    expect(fill).toBeInstanceOf(THREE.DirectionalLight);
    expect(fill?.castShadow).toBe(false);
    expect(ambient).toBeInstanceOf(THREE.HemisphereLight);
    expect(lights.filter((light) => light.castShadow)).toEqual([moon]);
  });
});
