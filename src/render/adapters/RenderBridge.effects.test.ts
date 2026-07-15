import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { RenderBridge } from './RenderBridge';

describe('RenderBridge presentation effects', () => {
  it('keeps semantic impact effects inside fixed pools', () => {
    const scene = new THREE.Scene();
    const bridge = new RenderBridge(scene);

    expect(scene.children.filter((child) => child.name.startsWith('pooled-impact-ring-'))).toHaveLength(6);
    expect(scene.children.filter((child) => child.name.startsWith('pooled-hit-burst-'))).toHaveLength(4);
    expect(scene.children.filter((child) => child.name.startsWith('pooled-signature-vfx-'))).toHaveLength(6);

    for (let index = 0; index < 20; index += 1) {
      bridge.bootContactBurst({ x: index, y: 0.1, z: -index }, 1);
      bridge.groundBurst({ x: index, y: 0, z: index }, 0.8);
      bridge.goalBurst({ x: 0, y: 0.2, z: index }, 1.2);
      bridge.healBurst({ x: 0, y: 0.2, z: index }, 0.8);
      bridge.bossBurst({ x: 0, y: 0.2, z: index }, 1.3);
    }

    expect(scene.children.filter((child) => child.name.startsWith('pooled-impact-ring-'))).toHaveLength(6);
    expect(scene.children.filter((child) => child.name.startsWith('pooled-hit-burst-'))).toHaveLength(4);
    expect(scene.children.filter((child) => child.name.startsWith('pooled-signature-vfx-'))).toHaveLength(6);
    bridge.dispose();
  });

  it('scales particle density with render quality and supports reduced flashes', () => {
    const scene = new THREE.Scene();
    const bridge = new RenderBridge(scene);
    const burst = scene.getObjectByName('pooled-hit-burst-0') as THREE.Points;

    bridge.setRenderQuality('performance');
    bridge.setReducedFlashes(true);
    bridge.hitBurst({ x: 0, y: 1, z: 0 }, 1);

    expect(burst.geometry.drawRange.count).toBe(8);
    expect((burst.material as THREE.PointsMaterial).opacity).toBeLessThanOrEqual(0.45);

    bridge.setRenderQuality('quality');
    bridge.setReducedFlashes(false);
    bridge.hitBurst({ x: 0, y: 1, z: 0 }, 1);
    const qualityBurst = scene.getObjectByName('pooled-hit-burst-1') as THREE.Points;
    expect(qualityBurst.geometry.drawRange.count).toBe(14);
    bridge.dispose();
  });
});
