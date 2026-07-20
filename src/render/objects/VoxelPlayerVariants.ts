import * as THREE from 'three';
import { CHARACTER_DEFINITIONS, type CharacterId } from '../../game/characters';
import { CHARACTER_VARIANT_VISUALS } from './PlayerCharacterVariants';
import type { VoxelHumanoid } from './VoxelHumanoid';

export interface VoxelPlayerVariantController {
  readonly apply: (id: CharacterId) => void;
  readonly dispose: () => void;
}

interface OwnedVariantResources {
  readonly geometries: Set<THREE.BufferGeometry>;
  readonly materials: Set<THREE.Material>;
  readonly jointAnchors: Set<THREE.Object3D>;
}

/**
 * Adds six original block-football silhouettes to one articulated rig.
 * Accessories are joint-mounted, so every variant shares the same animation
 * controller and gameplay collision contract.
 */
export function createVoxelPlayerVariantController(rig: VoxelHumanoid): VoxelPlayerVariantController {
  const roots = new Map<CharacterId, THREE.Group>();
  const resources: OwnedVariantResources = {
    geometries: new Set(),
    materials: new Set(),
    jointAnchors: new Set(),
  };

  for (const id of Object.keys(CHARACTER_DEFINITIONS) as CharacterId[]) {
    const root = new THREE.Group();
    root.name = `player-accessory-${id}`;
    root.userData.characterVariant = id;
    root.userData.visualStyle = 'original-block-football';
    root.visible = false;
    rig.root.add(root);
    roots.set(id, root);
    addVariantIdentity(id, rig, root, resources);
  }

  let disposed = false;
  return {
    apply: (id) => {
      if (disposed) return;
      const style = CHARACTER_DEFINITIONS[id].visualStyle;
      const visual = CHARACTER_VARIANT_VISUALS[id];
      rig.setPalette({
        primary: style.primaryColor,
        secondary: style.accentColor,
        accent: style.accentColor,
        boots: style.bootColor,
        hair: visual.hairColor,
      });
      rig.root.scale.set(...visual.bodyScale);
      rig.root.userData.characterVariant = id;
      rig.root.userData.sharedSkeleton = true;
      for (const [candidate, root] of roots) root.visible = candidate === id;
      rig.root.traverse((object) => {
        const candidate = object.userData.characterVariant as CharacterId | undefined;
        if (candidate) object.visible = candidate === id;
      });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const anchor of resources.jointAnchors) anchor.removeFromParent();
      for (const root of roots.values()) root.removeFromParent();
      for (const geometry of resources.geometries) geometry.dispose();
      for (const material of resources.materials) material.dispose();
      roots.clear();
      resources.geometries.clear();
      resources.materials.clear();
      resources.jointAnchors.clear();
    },
  };
}

function addVariantIdentity(
  id: CharacterId,
  rig: VoxelHumanoid,
  root: THREE.Group,
  resources: OwnedVariantResources,
): void {
  const style = CHARACTER_DEFINITIONS[id].visualStyle;
  const primary = material(style.primaryColor, resources);
  const accent = material(style.accentColor, resources, 0.46, 0.12);
  const dark = material(CHARACTER_VARIANT_VISUALS[id].hairColor, resources, 0.82);

  if (id === 'maestro') {
    attachBlock(rig.head, root, 'maestro-swept-crown', [0.38, 0.12, 0.34], dark, resources, [-0.08, 0.46, 0]);
    attachBlock(
      rig.torso,
      root,
      'maestro-scarf',
      [0.12, 0.58, 0.08],
      accent,
      resources,
      [-0.28, 0.36, -0.15],
      [0.18, 0, 0.24],
    );
    attachBlock(
      rig.leftUpperArm,
      root,
      'maestro-captain-band',
      [0.2, 0.1, 0.21],
      accent,
      resources,
      [0, -0.2, 0],
    );
  } else if (id === 'breakaway') {
    attachBlock(
      rig.head,
      root,
      'breakaway-speed-crest',
      [0.12, 0.3, 0.34],
      accent,
      resources,
      [0, 0.56, -0.02],
      [0, 0, -0.28],
    );
    attachBlock(
      rig.leftLowerLeg,
      root,
      'breakaway-calf-fin-left',
      [0.08, 0.28, 0.22],
      accent,
      resources,
      [-0.12, -0.22, -0.02],
    );
    attachBlock(
      rig.rightLowerLeg,
      root,
      'breakaway-calf-fin-right',
      [0.08, 0.28, 0.22],
      accent,
      resources,
      [0.12, -0.22, -0.02],
    );
  } else if (id === 'tower') {
    attachBlock(
      rig.leftUpperArm,
      root,
      'tower-shoulder-left',
      [0.36, 0.18, 0.42],
      accent,
      resources,
      [0, -0.06, 0],
    );
    attachBlock(
      rig.rightUpperArm,
      root,
      'tower-shoulder-right',
      [0.36, 0.18, 0.42],
      accent,
      resources,
      [0, -0.06, 0],
    );
    attachBlock(rig.head, root, 'tower-iron-crop', [0.42, 0.13, 0.36], dark, resources, [0, 0.46, 0]);
  } else if (id === 'finisher') {
    attachBlock(
      rig.head,
      root,
      'finisher-widows-peak',
      [0.26, 0.16, 0.36],
      dark,
      resources,
      [0, 0.47, 0.02],
      [0, 0, Math.PI / 4],
    );
    attachBlock(
      rig.torso,
      root,
      'finisher-collar-left',
      [0.1, 0.3, 0.12],
      accent,
      resources,
      [-0.18, 0.59, 0.03],
      [0, 0, -0.42],
    );
    attachBlock(
      rig.torso,
      root,
      'finisher-collar-right',
      [0.1, 0.3, 0.12],
      accent,
      resources,
      [0.18, 0.59, 0.03],
      [0, 0, 0.42],
    );
  } else if (id === 'engine') {
    attachBlock(
      rig.sockets.back,
      root,
      'engine-shard-canister',
      [0.34, 0.58, 0.2],
      accent,
      resources,
      [0, 0, -0.11],
    );
    attachBlock(
      rig.leftLowerArm,
      root,
      'engine-wrist-wrap-left',
      [0.22, 0.13, 0.23],
      primary,
      resources,
      [0, -0.34, 0],
    );
    attachBlock(
      rig.rightLowerArm,
      root,
      'engine-wrist-wrap-right',
      [0.22, 0.13, 0.23],
      primary,
      resources,
      [0, -0.34, 0],
    );
  } else {
    attachBlock(
      rig.head,
      root,
      'guardian-keeper-helm',
      [0.54, 0.3, 0.5],
      primary,
      resources,
      [0, 0.4, -0.02],
    );
    attachBlock(
      rig.leftLowerArm,
      root,
      'guardian-forearm-left',
      [0.28, 0.34, 0.3],
      accent,
      resources,
      [0, -0.2, 0],
    );
    attachBlock(
      rig.rightLowerArm,
      root,
      'guardian-forearm-right',
      [0.28, 0.34, 0.3],
      accent,
      resources,
      [0, -0.2, 0],
    );
  }
}

function attachBlock(
  joint: THREE.Object3D,
  variantRoot: THREE.Group,
  name: string,
  size: readonly [number, number, number],
  surface: THREE.Material,
  resources: OwnedVariantResources,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): void {
  const anchor = new THREE.Group();
  anchor.name = `player-variant-anchor-${name}`;
  anchor.userData.characterVariant = variantRoot.userData.characterVariant;
  anchor.visible = false;
  joint.add(anchor);
  resources.jointAnchors.add(anchor);
  const piece = block(anchor, name, size, surface, resources, position, rotation);
  piece.userData.characterVariant = variantRoot.userData.characterVariant;
  piece.userData.jointMounted = true;
}

function block(
  parent: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  surface: THREE.Material,
  resources: OwnedVariantResources,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(...size);
  resources.geometries.add(geometry);
  const result = new THREE.Mesh(geometry, surface);
  result.name = `player-variant-${name}`;
  result.position.set(...position);
  result.rotation.set(...rotation);
  result.castShadow = true;
  result.userData.visualStyle = 'original-block-football';
  parent.add(result);
  return result;
}

function material(
  color: THREE.ColorRepresentation,
  resources: OwnedVariantResources,
  roughness = 0.68,
  metalness = 0.04,
): THREE.MeshStandardMaterial {
  const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  resources.materials.add(result);
  return result;
}
