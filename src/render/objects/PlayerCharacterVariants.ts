import * as THREE from 'three';
import { CHARACTER_DEFINITIONS, type CharacterId } from '../../game/characters';

export interface CharacterVariantVisual {
  readonly id: CharacterId;
  readonly bodyScale: readonly [number, number, number];
  readonly accessoryNames: readonly string[];
  readonly headStyle:
    'swept-crown' | 'speed-crest' | 'iron-crop' | 'widows-peak' | 'circuit-braid' | 'keeper-helm';
  readonly hairColor: number;
  readonly kitRoughness: number;
  readonly kitMetalness: number;
  readonly emissiveStrength: number;
}

export const CHARACTER_VARIANT_VISUALS: Readonly<Record<CharacterId, CharacterVariantVisual>> = Object.freeze(
  {
    maestro: variant(
      'maestro',
      [0.97, 1, 0.96],
      ['captain-armband', 'wrist-rune', 'swept-crown', 'maestro-boot-left', 'maestro-boot-right'],
      'swept-crown',
      0x282039,
      0.5,
      0.14,
      0.2,
    ),
    breakaway: variant(
      'breakaway',
      [0.9, 1.03, 0.9],
      ['calf-fin-left', 'calf-fin-right', 'speed-crest', 'breakaway-boot-left', 'breakaway-boot-right'],
      'speed-crest',
      0x1558a3,
      0.42,
      0.12,
      0.3,
    ),
    tower: variant(
      'tower',
      [1.1, 1.1, 1.12],
      ['shoulder-plate-left', 'shoulder-plate-right', 'iron-crop', 'tower-boot-left', 'tower-boot-right'],
      'iron-crop',
      0x16141c,
      0.64,
      0.38,
      0.14,
    ),
    finisher: variant(
      'finisher',
      [0.99, 1.02, 0.97],
      ['fang-collar-left', 'fang-collar-right', 'widows-peak', 'finisher-boot-left', 'finisher-boot-right'],
      'widows-peak',
      0x4a1724,
      0.46,
      0.2,
      0.34,
    ),
    engine: variant(
      'engine',
      [0.94, 1.06, 0.93],
      [
        'wrist-wrap-left',
        'wrist-wrap-right',
        'shard-canister',
        'circuit-braid',
        'engine-boot-left',
        'engine-boot-right',
      ],
      'circuit-braid',
      0x173b31,
      0.52,
      0.16,
      0.42,
    ),
    guardian: variant(
      'guardian',
      [1.08, 1.05, 1.1],
      [
        'forearm-guard-left',
        'forearm-guard-right',
        'keeper-helm',
        'guardian-boot-left',
        'guardian-boot-right',
      ],
      'keeper-helm',
      0x202a38,
      0.7,
      0.32,
      0.12,
    ),
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
      object.traverse((child) => {
        child.userData.characterVariant = id;
      });
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
  const hair = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: CHARACTER_VARIANT_VISUALS[id].hairColor,
      roughness: id === 'guardian' ? 0.34 : 0.78,
      metalness: id === 'guardian' ? 0.48 : 0.04,
    }),
    materials,
  );

  attachHeadIdentity(model, variantRoot, id, hair, accent, geometries);
  attachBoot(model, variantRoot, 'foot_l', `${id}-boot-left`, -1, style.bootColor, geometries, materials);
  attachBoot(model, variantRoot, 'foot_r', `${id}-boot-right`, 1, style.bootColor, geometries, materials);

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

function attachHeadIdentity(
  model: THREE.Group,
  root: THREE.Group,
  id: CharacterId,
  hair: THREE.Material,
  accent: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): void {
  const name = CHARACTER_VARIANT_VISUALS[id].headStyle;
  const group = new THREE.Group();
  group.name = `character-accessory-${name}`;
  group.userData.characterVariant = id;
  if (id === 'guardian') {
    const helmet = accessory(
      new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hair,
      `${name}-shell`,
      geometries,
    );
    helmet.scale.set(1.15, 0.92, 1.05);
    group.add(helmet);
    const visor = accessory(new THREE.BoxGeometry(0.22, 0.035, 0.035), accent, `${name}-visor`, geometries);
    visor.position.set(0, -0.015, 0.12);
    group.add(visor);
  } else {
    const cap = accessory(
      new THREE.SphereGeometry(0.125, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.48),
      hair,
      `${name}-cap`,
      geometries,
    );
    cap.scale.set(id === 'tower' ? 1.08 : 1, id === 'tower' ? 0.52 : 0.74, 1);
    group.add(cap);
    const crestCount = id === 'engine' ? 3 : id === 'tower' ? 1 : 2;
    for (let index = 0; index < crestCount; index += 1) {
      const crest = accessory(
        new THREE.ConeGeometry(0.025, id === 'breakaway' ? 0.16 : 0.11, 5),
        hair,
        `${name}-crest-${index}`,
        geometries,
      );
      crest.position.set((index - (crestCount - 1) / 2) * 0.045, 0.09, id === 'finisher' ? 0.08 : -0.015);
      crest.rotation.z = id === 'maestro' ? -0.38 : id === 'breakaway' ? 0.52 : 0;
      group.add(crest);
    }
  }
  group.position.set(0, 0.1, 0);
  attach(model, root, 'Head', group);
}

function attachBoot(
  model: THREE.Group,
  root: THREE.Group,
  joint: string,
  name: string,
  side: number,
  color: number,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
): void {
  const surface = ownMaterial(
    new THREE.MeshStandardMaterial({ color, roughness: 0.46, metalness: 0.12 }),
    materials,
  );
  const mesh = accessory(new THREE.CapsuleGeometry(0.065, 0.13, 2, 6), surface, name, geometries);
  mesh.position.set(side * 0.008, -0.04, 0.075);
  mesh.rotation.x = Math.PI / 2;
  mesh.scale.set(0.92, 1.28, 0.82);
  attach(model, root, joint, mesh);
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

function attach(model: THREE.Group, fallback: THREE.Group, jointName: string, mesh: THREE.Object3D): void {
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
  const treatment = CHARACTER_VARIANT_VISUALS[id];
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node.userData.characterVariant) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.roughness = treatment.kitRoughness;
      material.metalness = treatment.kitMetalness;
      if (material.name.includes('Eyes')) {
        material.emissive.setHex(style.accentColor);
        material.emissiveIntensity = treatment.emissiveStrength + 0.18;
      } else if (material.name.includes('Hair')) {
        material.color.setHex(treatment.hairColor);
      } else {
        material.color.setHex(style.primaryColor);
        material.emissive.setHex(style.accentColor);
        material.emissiveIntensity = treatment.emissiveStrength;
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
  headStyle: CharacterVariantVisual['headStyle'],
  hairColor: number,
  kitRoughness: number,
  kitMetalness: number,
  emissiveStrength: number,
): CharacterVariantVisual {
  const frozenBodyScale = Object.freeze([...bodyScale]) as readonly [number, number, number];
  return Object.freeze({
    id,
    bodyScale: frozenBodyScale,
    accessoryNames: Object.freeze([...accessoryNames]),
    headStyle,
    hairColor,
    kitRoughness,
    kitMetalness,
    emissiveStrength,
  });
}
