import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  disposeVoxelFootballPropGeometries,
  voxelFootballPropGeometry,
  type VoxelFootballProp,
} from './VoxelFootballProps';

const PROPS: readonly VoxelFootballProp[] = [
  'bloodBall',
  'spectralBall',
  'cleatedBoot',
  'whistle',
  'trophy',
  'banner',
  'redCard',
  'goalNet',
  'bloodShard',
  'bloodBolt',
];

describe('voxel football prop library', () => {
  it('provides distinct authored compound silhouettes for the complete visual armory', () => {
    const geometries = PROPS.map((kind) => voxelFootballPropGeometry(kind));
    expect(new Set(geometries)).toHaveLength(PROPS.length);
    for (let index = 0; index < geometries.length; index += 1) {
      const geometry = geometries[index]!;
      expect(geometry.userData.visualStyle).toBe('authored-voxel-football-prop');
      expect(geometry.userData.voxelFootballProp).toBe(PROPS[index]);
      expect(geometry.getAttribute('position').count).toBeGreaterThan(24);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).toBeInstanceOf(THREE.Box3);
    }
  });

  it('reuses cached geometry until the shared library is explicitly disposed', () => {
    const first = voxelFootballPropGeometry('bloodBall');
    expect(voxelFootballPropGeometry('bloodBall')).toBe(first);
    disposeVoxelFootballPropGeometries();
    expect(voxelFootballPropGeometry('bloodBall')).not.toBe(first);
  });
});
