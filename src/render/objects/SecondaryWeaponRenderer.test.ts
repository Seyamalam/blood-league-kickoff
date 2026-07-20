import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { SecondaryWeaponSystem, type GarlicZoneState } from '../../game/combat';
import { SecondaryWeaponRenderer } from './SecondaryWeaponRenderer';

const EXPECTED_CAPACITIES = Object.freeze({
  garlic: 24,
  orbit: 3,
  'ghost-pass': 8,
  'multi-ball': 6,
  'black-hole': 4,
});

describe('SecondaryWeaponRenderer', () => {
  it('owns five fixed instanced batches with shared bounded resources', () => {
    const scene = new THREE.Scene();
    new SecondaryWeaponRenderer(scene);
    const meshes = secondaryMeshes(scene);

    expect(meshes).toHaveLength(5);
    expect(Object.fromEntries(meshes.map((mesh) => [family(mesh), mesh.instanceMatrix.count]))).toEqual(
      EXPECTED_CAPACITIES,
    );
    expect(meshes.every((mesh) => mesh.count === 0 && !mesh.visible)).toBe(true);
    expect(meshes.every((mesh) => mesh.instanceMatrix.usage === THREE.DynamicDrawUsage)).toBe(true);
    expect(meshes.every((mesh) => !mesh.frustumCulled)).toBe(true);
    expect(new Set(meshes.map((mesh) => mesh.geometry))).toHaveLength(5);
    expect(new Set(meshes.map((mesh) => mesh.material))).toHaveLength(5);
    expect(
      meshes.every((mesh) => mesh.geometry.userData.visualStyle === 'authored-voxel-football-prop'),
    ).toBe(true);

    const transparentFamilies = ['garlic', 'ghost-pass', 'multi-ball', 'black-hole'] as const;
    for (const semanticFamily of transparentFamilies) {
      const material = meshesByFamily(meshes)[semanticFamily].material as THREE.Material;
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
    }
    const orbitMaterial = meshesByFamily(meshes).orbit.material as THREE.MeshStandardMaterial;
    expect(orbitMaterial.transparent).toBe(false);
    expect(orbitMaterial.depthWrite).toBe(true);
    expect(orbitMaterial.emissive.getHex()).toBe(0x548bb5);

    const triangleBudget = meshes.reduce(
      (total, mesh) => total + geometryTriangles(mesh.geometry) * mesh.instanceMatrix.count,
      0,
    );
    expect(triangleBudget).toBeLessThanOrEqual(6_000);
  });

  it('packs sparse active states into matrices without growing resources', () => {
    const scene = new THREE.Scene();
    const renderer = new SecondaryWeaponRenderer(scene);
    const system = new SecondaryWeaponSystem();
    const state = system.renderState;
    const meshes = secondaryMeshes(scene);
    const byFamily = meshesByFamily(meshes);
    const identities = meshes.map((mesh) => ({ mesh, geometry: mesh.geometry, material: mesh.material }));

    Object.assign(state.garlicZones[1]!, { active: true, position: { x: 1, y: -2, z: 3 } });
    Object.assign(state.garlicZones[5]!, { active: true, position: { x: 5, y: 0.7, z: 6 } });
    Object.assign(state.orbitingBalls[1]!, {
      active: true,
      position: { x: 2, y: 3, z: 4 },
      radius: 0.64,
    });
    Object.assign(state.ghostPasses[4]!, {
      active: true,
      position: { x: -2, y: 1, z: -4 },
      radius: 0.32,
    });
    Object.assign(state.multiBallShots[2]!, {
      active: true,
      position: { x: 7, y: 1.2, z: 8 },
      radius: 0.16,
    });
    Object.assign(state.blackHoleZones[3]!, {
      active: true,
      position: { x: -7, y: 0, z: 2 },
      radius: 1.6,
      age: 2,
    });

    const versions = Object.fromEntries(meshes.map((mesh) => [family(mesh), mesh.instanceMatrix.version]));
    renderer.sync(state);

    expect(byFamily.garlic.count).toBe(2);
    expect(byFamily.orbit.count).toBe(1);
    expect(byFamily['ghost-pass'].count).toBe(1);
    expect(byFamily['multi-ball'].count).toBe(1);
    expect(byFamily['black-hole'].count).toBe(1);
    expect(meshes.every((mesh) => mesh.visible)).toBe(true);
    expect(meshes.every((mesh) => mesh.instanceMatrix.version > versions[family(mesh)]!)).toBe(true);
    const firstGarlic = readTransform(byFamily.garlic, 0);
    expect(firstGarlic.position.x).toBeCloseTo(1);
    expect(firstGarlic.position.y).toBeCloseTo(0.04);
    expect(firstGarlic.position.z).toBeCloseTo(3);
    expect(firstGarlic.scale.x).toBeCloseTo(0.62);
    expect(firstGarlic.scale.y).toBeCloseTo(0.62);
    expect(firstGarlic.scale.z).toBeCloseTo(0.62);
    expect(readTransform(byFamily.garlic, 1).position.x).toBe(5);
    const orbit = readTransform(byFamily.orbit, 0);
    expect(orbit.position).toMatchObject({ x: 2, y: 3, z: 4 });
    expect(orbit.scale.x).toBeCloseTo(2);
    expect(orbit.scale.y).toBeCloseTo(2);
    expect(orbit.scale.z).toBeCloseTo(2);
    expect(readTransform(byFamily['multi-ball'], 0).scale.x).toBeCloseTo(0.5);
    const blackHole = readTransform(byFamily['black-hole'], 0);
    expect(blackHole.position.x).toBeCloseTo(-7);
    expect(blackHole.position.y).toBeCloseTo(0.04);
    expect(blackHole.position.z).toBeCloseTo(2);
    expect(blackHole.scale.x).toBeCloseTo(1);
    const expectedRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 3.18, 0));
    expect(Math.abs(blackHole.rotation.dot(expectedRotation))).toBeCloseTo(1, 5);

    state.garlicZones[1]!.active = false;
    renderer.sync(state);
    expect(byFamily.garlic.count).toBe(1);
    expect(readTransform(byFamily.garlic, 0).position.x).toBe(5);
    expect(scene.children).toHaveLength(5);
    identities.forEach(({ mesh, geometry, material }) => {
      expect(mesh.geometry).toBe(geometry);
      expect(mesh.material).toBe(material);
    });

    const oversizedGarlic: GarlicZoneState[] = Array.from({ length: 30 }, (_, index) => ({
      active: true,
      position: { x: index, y: 0, z: 0 },
      radius: 0.82,
      age: 0,
      lifetime: 1,
    }));
    renderer.sync({ ...state, garlicZones: oversizedGarlic });
    expect(byFamily.garlic.count).toBe(24);
  });

  it('resets visibility and disposes each unique resource exactly once', () => {
    const scene = new THREE.Scene();
    const renderer = new SecondaryWeaponRenderer(scene);
    const meshes = secondaryMeshes(scene);
    const geometries = [...new Set(meshes.map((mesh) => mesh.geometry))];
    const materials = [...new Set(meshes.map((mesh) => mesh.material as THREE.Material))];
    const geometrySpies = geometries.map((geometry) => vi.spyOn(geometry, 'dispose'));
    const materialSpies = materials.map((material) => vi.spyOn(material, 'dispose'));
    const state = new SecondaryWeaponSystem().renderState;
    state.orbitingBalls[0]!.active = true;

    renderer.sync(state);
    renderer.reset();
    expect(meshes.every((mesh) => mesh.count === 0 && !mesh.visible)).toBe(true);
    expect(geometrySpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(materialSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);

    renderer.dispose();
    renderer.dispose();
    expect(scene.children).toHaveLength(0);
    expect(geometrySpies.every((spy) => spy.mock.calls.length === 1)).toBe(true);
    expect(materialSpies.every((spy) => spy.mock.calls.length === 1)).toBe(true);
  });
});

function secondaryMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  return scene.children.filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);
}

function family(mesh: THREE.InstancedMesh): keyof typeof EXPECTED_CAPACITIES {
  return mesh.userData.secondaryWeaponFamily as keyof typeof EXPECTED_CAPACITIES;
}

function meshesByFamily(
  meshes: readonly THREE.InstancedMesh[],
): Record<keyof typeof EXPECTED_CAPACITIES, THREE.InstancedMesh> {
  return Object.fromEntries(meshes.map((mesh) => [family(mesh), mesh])) as Record<
    keyof typeof EXPECTED_CAPACITIES,
    THREE.InstancedMesh
  >;
}

function readTransform(
  mesh: THREE.InstancedMesh,
  index: number,
): {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
} {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, rotation, scale);
  return { position, rotation, scale };
}

function geometryTriangles(geometry: THREE.BufferGeometry): number {
  return geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
}
