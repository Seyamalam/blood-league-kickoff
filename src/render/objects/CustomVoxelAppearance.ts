import * as THREE from 'three';
import type { CustomCharacterAppearance } from '../../profile/CharacterCustomizationStore';
import type { VoxelHumanoid } from './VoxelHumanoid';

export interface CustomVoxelAppearanceController {
  readonly apply: (appearance: Readonly<CustomCharacterAppearance>) => void;
  readonly update: (dt: number) => void;
  readonly dispose: () => void;
}

const BUILD_SCALE = Object.freeze({
  agile: [0.94, 1.04, 0.94],
  balanced: [1, 1, 1],
  powerful: [1.08, 1.01, 1.08],
} satisfies Record<CustomCharacterAppearance['bodyBuild'], readonly [number, number, number]>);

const AURA_COLORS: Readonly<Record<Exclude<CustomCharacterAppearance['auraStyle'], 'none'>, number>> =
  Object.freeze({
    crimson: 0xff315d,
    violet: 0x8f63ff,
    gold: 0xffcf5a,
  });

/** Adds creator-only kit geometry without changing the shared animation skeleton. */
export function createCustomVoxelAppearanceController(rig: VoxelHumanoid): CustomVoxelAppearanceController {
  const patternRoots = {
    classic: new THREE.Group(),
    sash: new THREE.Group(),
    quartered: new THREE.Group(),
    keeper: new THREE.Group(),
  };
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const patternMeshes: THREE.Mesh[] = [];
  const auraMeshes: THREE.Mesh[] = [];

  for (const [name, root] of Object.entries(patternRoots)) {
    root.name = `custom-kit-pattern-${name}`;
    root.visible = false;
    rig.torso.add(root);
  }
  addBlock(patternRoots.classic, 'custom-classic-stripe', [0.12, 0.78, 0.055], [0, 0, 0.32]);
  addBlock(patternRoots.sash, 'custom-sash', [0.13, 0.95, 0.055], [0, 0, 0.32], [0, 0, -0.58]);
  addBlock(patternRoots.quartered, 'custom-quarter-top-left', [0.36, 0.38, 0.055], [-0.2, 0.22, 0.32]);
  addBlock(patternRoots.quartered, 'custom-quarter-bottom-right', [0.36, 0.38, 0.055], [0.2, -0.22, 0.32]);
  addBlock(patternRoots.keeper, 'custom-keeper-bar', [0.66, 0.12, 0.055], [0, 0.2, 0.32]);
  addBlock(patternRoots.keeper, 'custom-keeper-stem', [0.12, 0.5, 0.055], [0, -0.08, 0.32]);

  const auraRoot = new THREE.Group();
  auraRoot.name = 'custom-player-voxel-aura';
  auraRoot.position.y = 0.05;
  rig.root.add(auraRoot);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const mesh = addBlock(
      auraRoot,
      `custom-aura-shard-${index}`,
      [0.09, 0.08 + (index % 3) * 0.025, 0.16],
      [Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7],
      [0, -angle, 0],
      true,
    );
    auraMeshes.push(mesh);
  }
  auraRoot.visible = false;

  let disposed = false;
  let auraElapsed = 0;
  return {
    apply: (appearance) => {
      if (disposed) return;
      for (const [pattern, root] of Object.entries(patternRoots)) {
        root.visible = appearance.enabled && pattern === appearance.kitPattern;
      }
      for (const mesh of patternMeshes) {
        (mesh.material as THREE.MeshStandardMaterial).color.set(appearance.secondary);
      }
      auraRoot.visible = appearance.enabled && appearance.auraStyle !== 'none';
      if (appearance.auraStyle !== 'none') {
        const color = AURA_COLORS[appearance.auraStyle];
        for (const mesh of auraMeshes) (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
      const [x, y, z] = appearance.enabled ? BUILD_SCALE[appearance.bodyBuild] : BUILD_SCALE.balanced;
      rig.root.scale.multiply(new THREE.Vector3(x, y, z));
      rig.root.userData.customKitPattern = appearance.kitPattern;
      rig.root.userData.customAura = appearance.auraStyle;
      rig.root.userData.customBodyBuild = appearance.bodyBuild;
    },
    update: (dt) => {
      if (disposed || !auraRoot.visible) return;
      const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
      auraElapsed += step;
      auraRoot.rotation.y = auraElapsed * 0.72;
      for (let index = 0; index < auraMeshes.length; index += 1) {
        const mesh = auraMeshes[index]!;
        mesh.position.y = 0.025 + Math.sin(auraElapsed * 3.2 + index * 0.72) * 0.045;
        const pulse = 0.82 + Math.sin(auraElapsed * 4.1 + index) * 0.16;
        mesh.scale.setScalar(pulse);
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const root of Object.values(patternRoots)) root.removeFromParent();
      auraRoot.removeFromParent();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      geometries.clear();
      materials.clear();
    },
  };

  function addBlock(
    parent: THREE.Group,
    name: string,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    rotation: readonly [number, number, number] = [0, 0, 0],
    aura = false,
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(...size);
    const material = aura
      ? new THREE.MeshBasicMaterial({
          color: AURA_COLORS.crimson,
          transparent: true,
          opacity: 0.74,
          depthWrite: false,
        })
      : new THREE.MeshStandardMaterial({ color: 0xc72f62, roughness: 0.58, metalness: 0.08 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.userData.visualStyle = 'custom-voxel-football-kit';
    parent.add(mesh);
    geometries.add(geometry);
    materials.add(material);
    if (!aura) patternMeshes.push(mesh);
    return mesh;
  }
}
