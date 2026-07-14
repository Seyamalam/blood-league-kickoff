import * as THREE from 'three';
import { CHARACTER_DEFINITIONS, type CharacterId } from '../../game/characters';

export interface CharacterVariantVisual {
  readonly id: CharacterId;
  readonly bodyScale: readonly [number, number, number];
  readonly accessoryNames: readonly string[];
}

export const CHARACTER_VARIANT_VISUALS: Readonly<Record<CharacterId, CharacterVariantVisual>> = Object.freeze(
  {
    maestro: variant('maestro', [0.97, 1, 0.96], ['captain-armband', 'wrist-rune']),
    breakaway: variant('breakaway', [0.93, 0.97, 0.92], ['calf-fin-left', 'calf-fin-right']),
    tower: variant('tower', [1.08, 1.07, 1.1], ['shoulder-plate-left', 'shoulder-plate-right']),
    finisher: variant('finisher', [1, 1.01, 0.98], ['fang-collar-left', 'fang-collar-right']),
    engine: variant('engine', [0.96, 1.03, 0.94], ['wrist-wrap-left', 'wrist-wrap-right', 'shard-canister']),
    guardian: variant('guardian', [1.07, 1.04, 1.08], ['forearm-guard-left', 'forearm-guard-right']),
  },
);

export interface ImportedCharacterVariantController {
  apply(id: CharacterId): void;
  dispose(): void;
}

/** Adds animation-safe accessories to documented joints while retaining one skeleton and bind pose. */
export function createImportedCharacterVariantController(
  model: THREE.Group,
): ImportedCharacterVariantController {
  const variantRoots = new Map<CharacterId, THREE.Group>();
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const ownedAccessories = new Set<THREE.Object3D>();

  for (const id of Object.keys(CHARACTER_VARIANT_VISUALS) as CharacterId[]) {
    const root = new THREE.Group();
    root.name = `imported-character-variant-${id}`;
    root.userData.characterVariant = id;
    root.visible = false;
    variantRoots.set(id, root);
    model.add(root);
    addVariantAccessories(id, model, root, ownedGeometries, ownedMaterials);
    for (const accessoryName of CHARACTER_VARIANT_VISUALS[id].accessoryNames) {
      const object = model.getObjectByName(`character-accessory-${accessoryName}`);
      if (!object) continue;
      object.userData.characterVariant = id;
      ownedAccessories.add(object);
    }
  }

  const apply = (id: CharacterId): void => {
    const definition = CHARACTER_VARIANT_VISUALS[id];
    model.scale.set(...definition.bodyScale);
    model.userData.characterVariant = id;
    model.userData.sharedSkeleton = true;
    for (const [candidate, root] of variantRoots) root.visible = candidate === id;
    for (const accessory of ownedAccessories) {
      accessory.visible = accessory.userData.characterVariant === id;
    }
    tintImportedMaterials(model, id);
  };

  return {
    apply,
    dispose: () => {
      for (const accessory of ownedAccessories) accessory.removeFromParent();
      for (const root of variantRoots.values()) root.removeFromParent();
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
      ownedAccessories.clear();
      variantRoots.clear();
    },
  };
}

function addVariantAccessories(
  id: CharacterId,
  model: THREE.Group,
  variantRoot: THREE.Group,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
): void {
  const style = CHARACTER_DEFINITIONS[id].visualStyle;
  const primary = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: style.primaryColor,
      emissive: style.accentColor,
      emissiveIntensity: 0.12,
      roughness: 0.56,
      metalness: 0.18,
    }),
    materials,
  );
  const accent = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: style.accentColor,
      emissive: style.accentColor,
      emissiveIntensity: 0.55,
      roughness: 0.38,
      metalness: 0.32,
    }),
    materials,
  );

  if (id === 'maestro') {
    attachRing(model, variantRoot, 'upperarm_l', 'captain-armband', 0.105, primary, geometries);
    attachRing(model, variantRoot, 'hand_l', 'wrist-rune', 0.085, accent, geometries);
  } else if (id === 'breakaway') {
    attachFin(model, variantRoot, 'calf_l', 'calf-fin-left', -1, accent, geometries);
    attachFin(model, variantRoot, 'calf_r', 'calf-fin-right', 1, accent, geometries);
  } else if (id === 'tower') {
    attachPlate(model, variantRoot, 'clavicle_l', 'shoulder-plate-left', -1, primary, geometries);
    attachPlate(model, variantRoot, 'clavicle_r', 'shoulder-plate-right', 1, primary, geometries);
  } else if (id === 'finisher') {
    attachFang(model, variantRoot, 'neck_01', 'fang-collar-left', -1, accent, geometries);
    attachFang(model, variantRoot, 'neck_01', 'fang-collar-right', 1, accent, geometries);
  } else if (id === 'engine') {
    attachRing(model, variantRoot, 'hand_l', 'wrist-wrap-left', 0.09, primary, geometries);
    attachRing(model, variantRoot, 'hand_r', 'wrist-wrap-right', 0.09, primary, geometries);
    attachCanister(model, variantRoot, 'pelvis', 'shard-canister', accent, geometries);
  } else {
    attachGuard(model, variantRoot, 'lowerarm_l', 'forearm-guard-left', -1, primary, geometries);
    attachGuard(model, variantRoot, 'lowerarm_r', 'forearm-guard-right', 1, primary, geometries);
  }
}

function attachRing(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  radius: number,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const mesh = accessory(new THREE.TorusGeometry(radius, 0.025, 5, 12), material, name, geometries);
  mesh.rotation.y = Math.PI / 2;
  attach(model, root, joint, mesh);
}

function attachFin(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  side: number,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const mesh = accessory(new THREE.ConeGeometry(0.055, 0.24, 4), material, name, geometries);
  mesh.position.set(side * 0.08, -0.1, 0.04);
  mesh.rotation.z = side * 0.42;
  attach(model, root, joint, mesh);
}

function attachPlate(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  side: number,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const mesh = accessory(new THREE.BoxGeometry(0.24, 0.1, 0.28), material, name, geometries);
  mesh.position.set(side * 0.14, 0, 0);
  mesh.rotation.z = side * 0.18;
  attach(model, root, joint, mesh);
}

function attachFang(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  side: number,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const mesh = accessory(new THREE.ConeGeometry(0.035, 0.16, 5), material, name, geometries);
  mesh.position.set(side * 0.09, -0.08, 0.08);
  mesh.rotation.z = side * 0.28;
  attach(model, root, joint, mesh);
}

function attachCanister(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const mesh = accessory(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 6), material, name, geometries);
  mesh.position.set(0.16, -0.03, 0.04);
  mesh.rotation.z = 0.14;
  attach(model, root, joint, mesh);
}

function attachGuard(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  side: number,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const mesh = accessory(new THREE.BoxGeometry(0.12, 0.3, 0.16), material, name, geometries);
  mesh.position.set(side * 0.025, -0.12, 0.02);
  attach(model, root, joint, mesh);
}

function attach(model: THREE.Group, fallback: THREE.Group, jointName: string, mesh: THREE.Mesh): void {
  const joint = model.getObjectByName(jointName);
  (joint ?? fallback).add(mesh);
}

function accessory(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  geometries: Set<THREE.BufferGeometry>,
): THREE.Mesh {
  geometries.add(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `character-accessory-${name}`;
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function tintImportedMaterials(model: THREE.Group, id: CharacterId): void {
  const style = CHARACTER_DEFINITIONS[id].visualStyle;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node.userData.characterVariant) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      if (material.name.includes('Eyes')) {
        material.emissive.setHex(style.accentColor);
        material.emissiveIntensity = 0.24;
      } else if (material.name.includes('Hair')) {
        material.color.setHex(0xd8d8e0).lerp(new THREE.Color(style.primaryColor), 0.18);
      } else {
        material.color.setHex(0xffffff).lerp(new THREE.Color(style.primaryColor), 0.08);
      }
    }
  });
}

function ownMaterial<T extends THREE.Material>(material: T, materials: Set<THREE.Material>): T {
  materials.add(material);
  return material;
}

function variant(
  id: CharacterId,
  bodyScale: readonly [number, number, number],
  accessoryNames: readonly string[],
): CharacterVariantVisual {
  const frozenBodyScale = Object.freeze([...bodyScale]) as readonly [number, number, number];
  return Object.freeze({
    id,
    bodyScale: frozenBodyScale,
    accessoryNames: Object.freeze([...accessoryNames]),
  });
}
