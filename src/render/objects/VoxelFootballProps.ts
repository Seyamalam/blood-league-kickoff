import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type VoxelFootballProp =
  | 'bloodBall'
  | 'spectralBall'
  | 'cleatedBoot'
  | 'whistle'
  | 'trophy'
  | 'banner'
  | 'redCard'
  | 'goalNet'
  | 'bloodShard'
  | 'bloodBolt';

const cache = new Map<VoxelFootballProp, THREE.BufferGeometry>();

function box(
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(...size);
  const transform = new THREE.Object3D();
  transform.position.set(...position);
  transform.rotation.set(...rotation);
  transform.updateMatrix();
  geometry.applyMatrix4(transform.matrix);
  return geometry;
}

function merge(parts: THREE.BufferGeometry[], name: VoxelFootballProp): THREE.BufferGeometry {
  const result = mergeGeometries(parts, false) ?? parts[0]!;
  if (result !== parts[0]) for (const part of parts) part.dispose();
  result.name = `voxel-football-${name}`;
  result.userData.visualStyle = 'authored-voxel-football-prop';
  result.userData.voxelFootballProp = name;
  return result;
}

function createGeometry(kind: VoxelFootballProp): THREE.BufferGeometry {
  if (kind === 'bloodBall' || kind === 'spectralBall') {
    const parts = [box([0.42, 0.42, 0.42], [0, 0, 0])];
    const plate = kind === 'bloodBall' ? 0.16 : 0.12;
    parts.push(
      box([plate, plate, 0.06], [0, 0, 0.24]),
      box([plate, plate, 0.06], [0, 0, -0.24]),
      box([0.06, plate, plate], [0.24, 0, 0]),
      box([0.06, plate, plate], [-0.24, 0, 0]),
      box([plate, 0.06, plate], [0, 0.24, 0]),
      box([plate, 0.06, plate], [0, -0.24, 0]),
    );
    return merge(parts, kind);
  }
  if (kind === 'cleatedBoot') {
    return merge(
      [
        box([0.34, 0.2, 0.64], [0, 0.05, 0.08]),
        box([0.3, 0.28, 0.3], [0, 0.2, -0.1]),
        ...[-0.1, 0.1].flatMap((x) => [
          box([0.055, 0.08, 0.055], [x, -0.09, -0.08]),
          box([0.055, 0.08, 0.055], [x, -0.09, 0.24]),
        ]),
      ],
      kind,
    );
  }
  if (kind === 'whistle') {
    return merge(
      [
        box([0.34, 0.18, 0.22], [0, 0, 0]),
        box([0.18, 0.12, 0.22], [0.24, -0.03, 0]),
        box([0.12, 0.08, 0.12], [-0.22, 0.02, 0]),
      ],
      kind,
    );
  }
  if (kind === 'trophy') {
    return merge(
      [
        box([0.32, 0.12, 0.26], [0, -0.42, 0]),
        box([0.12, 0.42, 0.12], [0, -0.16, 0]),
        box([0.44, 0.42, 0.34], [0, 0.22, 0]),
        box([0.16, 0.3, 0.12], [-0.32, 0.22, 0], [0, 0, -0.42]),
        box([0.16, 0.3, 0.12], [0.32, 0.22, 0], [0, 0, 0.42]),
      ],
      kind,
    );
  }
  if (kind === 'banner') {
    return merge(
      [
        box([0.08, 1.2, 0.08], [-0.38, 0, 0]),
        box([0.72, 0.68, 0.07], [0.02, 0.22, 0]),
        box([0.22, 0.2, 0.08], [-0.2, -0.22, 0], [0, 0, 0.55]),
        box([0.22, 0.2, 0.08], [0.24, -0.22, 0], [0, 0, -0.55]),
      ],
      kind,
    );
  }
  if (kind === 'redCard') {
    return merge(
      [
        box([0.42, 0.62, 0.055], [0, 0, 0]),
        box([0.32, 0.045, 0.025], [0, 0.16, 0.04]),
        box([0.24, 0.045, 0.025], [-0.04, 0.04, 0.04]),
      ],
      kind,
    );
  }
  if (kind === 'goalNet') {
    return merge(
      [
        box([0.11, 1.2, 0.11], [-0.7, 0, 0]),
        box([0.11, 1.2, 0.11], [0.7, 0, 0]),
        box([1.5, 0.11, 0.11], [0, 0.55, 0]),
        box([1.5, 0.06, 0.06], [0, -0.05, -0.35]),
        box([0.06, 1.15, 0.06], [-0.35, 0, -0.35]),
        box([0.06, 1.15, 0.06], [0.35, 0, -0.35]),
      ],
      kind,
    );
  }
  if (kind === 'bloodShard') {
    return merge(
      [
        box([0.13, 0.5, 0.13], [0, 0, 0], [0.15, 0, 0.18]),
        box([0.1, 0.3, 0.1], [0.12, -0.02, 0], [-0.25, 0, 0.62]),
        box([0.08, 0.24, 0.08], [-0.11, 0.03, 0], [0.32, 0, -0.58]),
      ],
      kind,
    );
  }
  return merge(
    [
      box([0.18, 0.18, 0.48], [0, 0, 0]),
      box([0.36, 0.08, 0.22], [0, 0, -0.12], [0, 0, 0.5]),
      box([0.36, 0.08, 0.22], [0, 0, -0.12], [0, 0, -0.5]),
    ],
    kind,
  );
}

export function voxelFootballPropGeometry(kind: VoxelFootballProp): THREE.BufferGeometry {
  let geometry = cache.get(kind);
  if (!geometry) {
    geometry = createGeometry(kind);
    cache.set(kind, geometry);
  }
  return geometry;
}

export function disposeVoxelFootballPropGeometries(): void {
  for (const geometry of cache.values()) geometry.dispose();
  cache.clear();
}
