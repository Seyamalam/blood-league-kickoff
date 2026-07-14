import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GoalBeacon } from './GoalBeacon';

describe('GoalBeacon', () => {
  it('turns the scoring window into a bright, shadow-free world marker', () => {
    const scene = new THREE.Scene();
    const beacon = new GoalBeacon(scene);
    const group = scene.getObjectByName('GoalOpportunityBeacon');
    const light = group?.getObjectByName('goal-beacon-light');

    expect(group?.visible).toBe(false);
    expect(group?.getObjectByName('goal-beacon-halo')).toBeInstanceOf(THREE.Mesh);
    expect(group?.getObjectByName('goal-beacon-arrow')).toBeInstanceOf(THREE.Mesh);
    expect(group?.getObjectByName('goal-beacon-beam')).toBeInstanceOf(THREE.Mesh);
    expect(light).toBeInstanceOf(THREE.PointLight);
    expect(light?.castShadow).toBe(false);

    beacon.setActive(true);
    beacon.update(1 / 60);
    expect(group?.visible).toBe(true);
    expect((light as THREE.PointLight).intensity).toBeGreaterThanOrEqual(14);

    beacon.reset();
    expect(group?.visible).toBe(false);
    expect((light as THREE.PointLight).intensity).toBe(0);

    beacon.dispose();
    expect(scene.getObjectByName('GoalOpportunityBeacon')).toBeUndefined();
  });
});
