import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createFootballVisual, createPanelledFootballGeometry } from './FootballVisual';

describe('panelled football presentation', () => {
  it('builds one named shadow-casting gameplay mesh', () => {
    const ball = createFootballVisual();
    expect(ball.name).toBe('panelled-blood-league-football');
    expect(ball.castShadow).toBe(true);
    expect(ball.userData.visualRole).toBe('primary-football');
    expect((ball.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
  });

  it('contains ivory, charcoal, and crimson face families', () => {
    const geometry = createPanelledFootballGeometry();
    const colors = geometry.getAttribute('color');
    const unique = new Set<string>();
    for (let index = 0; index < colors.count; index += 1) {
      unique.add(
        `${colors.getX(index).toFixed(3)}:${colors.getY(index).toFixed(3)}:${colors.getZ(index).toFixed(3)}`,
      );
    }
    expect(unique.size).toBe(3);
    geometry.computeBoundingSphere();
    expect(geometry.boundingSphere?.radius).toBeCloseTo(0.42, 4);
  });
});
