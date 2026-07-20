import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ArenaBeautyPass } from './ArenaBeautyPass';

describe('arena beauty pass', () => {
  it('adds quality-scalable authored presentation and disposes cleanly', () => {
    const scene = new THREE.Scene();
    const stadium = new THREE.Group();
    stadium.name = 'stadium-environment';
    stadium.userData.variantId = 'blood-court';
    scene.add(stadium);
    const pass = new ArenaBeautyPass(scene);
    const root = scene.getObjectByName('arena-beauty-pass');
    expect(root).toBeDefined();
    pass.setQuality('performance');
    expect(scene.getObjectByName('arena-light-shafts')?.visible).toBe(false);
    pass.setQuality('quality');
    expect(scene.getObjectByName('arena-light-shafts')?.visible).toBe(true);
    pass.setReducedMotion(false);
    pass.update(1 / 60);
    pass.dispose();
    expect(scene.getObjectByName('arena-beauty-pass')).toBeUndefined();
  });
});
