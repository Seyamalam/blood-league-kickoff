import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EnemyArchetype, EnemyAttackState } from '../../game/simulation/types';
import type { RenderQuality } from '../../settings/SettingsStore';

export type EnemyVisualLod = 'near' | 'mid' | 'far';

export interface EnemyCharacterPresentation {
  readonly lodRoot: THREE.Group;
  readonly proceduralBody: THREE.Group;
  readonly near: THREE.Group;
  readonly mid: THREE.Group;
  readonly far: THREE.Group;
  readonly leftArm?: THREE.Group;
  readonly rightArm?: THREE.Group;
  readonly leftLeg?: THREE.Group;
  readonly rightLeg?: THREE.Group;
  readonly shield?: THREE.Mesh;
  readonly aura?: THREE.Mesh;
  readonly leftWing?: THREE.Mesh;
  readonly rightWing?: THREE.Mesh;
  readonly mouth?: THREE.Mesh;
  readonly drainRing?: THREE.Mesh;
  readonly whistle?: THREE.Mesh;
  readonly whistleRing?: THREE.Mesh;
  readonly leftGlove?: THREE.Mesh;
  readonly rightGlove?: THREE.Mesh;
  readonly catchRing?: THREE.Mesh;
  readonly weapon?: THREE.Mesh;
  readonly specialRing?: THREE.Mesh;
  lod: EnemyVisualLod;
  lastPoseAt: number;
}

interface ArchetypeStyle {
  readonly kit: number;
  readonly accent: number;
  readonly scale: readonly [number, number, number];
  readonly stance: 'normal' | 'fast' | 'heavy' | 'hunched';
}

export interface EnemyVisualIdentity {
  readonly silhouette: string;
  readonly signatureEquipment: string;
}

export const ENEMY_VISUAL_IDENTITIES: Readonly<Record<EnemyArchetype, EnemyVisualIdentity>> = Object.freeze({
  bloodFan: { silhouette: 'scarved-supporter', signatureEquipment: 'club-scarf-and-cape' },
  winger: { silhouette: 'razor-wing-runner', signatureEquipment: 'paired-razor-wings' },
  defender: { silhouette: 'shield-wall', signatureEquipment: 'tower-shield' },
  coach: { silhouette: 'long-coat-director', signatureEquipment: 'tactical-board' },
  batSwarm: { silhouette: 'wide-wing-swarm', signatureEquipment: 'membrane-wings' },
  leechStriker: { silhouette: 'hunched-drainer', signatureEquipment: 'circular-maw' },
  corruptReferee: { silhouette: 'striped-official', signatureEquipment: 'gold-whistle' },
  bloodArcher: { silhouette: 'hooded-bowman', signatureEquipment: 'crescent-bow' },
  shadowRunner: { silhouette: 'veiled-sprinter', signatureEquipment: 'shadow-veil' },
  corpseBomber: { silhouette: 'hunched-bomb-carrier', signatureEquipment: 'fuse-backpack' },
  goalkeeperBrute: { silhouette: 'wide-glove-keeper', signatureEquipment: 'oversized-gloves' },
});

type EnemyCharacterBuilder = {
  -readonly [Key in keyof EnemyCharacterPresentation]?: EnemyCharacterPresentation[Key];
};

const STYLES: Readonly<Record<EnemyArchetype, ArchetypeStyle>> = {
  bloodFan: { kit: 0x4a153e, accent: 0xd92d62, scale: [0.94, 0.96, 0.94], stance: 'normal' },
  winger: { kit: 0x99153e, accent: 0xff547b, scale: [0.82, 1.06, 0.84], stance: 'fast' },
  defender: { kit: 0x372052, accent: 0x9a5db0, scale: [1.18, 1.02, 1.12], stance: 'heavy' },
  coach: { kit: 0x5f172d, accent: 0xd6af39, scale: [1.02, 1.07, 1], stance: 'normal' },
  batSwarm: { kit: 0x21152f, accent: 0xa72c67, scale: [0.88, 0.76, 0.9], stance: 'fast' },
  leechStriker: { kit: 0x54203d, accent: 0xe25276, scale: [1.08, 0.94, 1.12], stance: 'hunched' },
  corruptReferee: { kit: 0x222126, accent: 0xe7dfcd, scale: [0.92, 1.03, 0.9], stance: 'normal' },
  bloodArcher: { kit: 0x56152f, accent: 0xc7a13a, scale: [0.88, 1.04, 0.9], stance: 'normal' },
  shadowRunner: { kit: 0x12101f, accent: 0x7658ba, scale: [0.78, 1.08, 0.82], stance: 'fast' },
  corpseBomber: { kit: 0x563026, accent: 0xff873c, scale: [1.16, 0.95, 1.14], stance: 'hunched' },
  goalkeeperBrute: { kit: 0x271d43, accent: 0xc7b5dd, scale: [1.36, 1.12, 1.26], stance: 'heavy' },
};

const geometry = {
  // Shared cuboid anatomy keeps every articulated enemy on the same lightweight
  // voxel language. Archetype equipment remains free to use stronger silhouettes.
  torso: new THREE.BoxGeometry(0.68, 1.12, 0.52),
  head: new THREE.BoxGeometry(0.5, 0.5, 0.5),
  eyes: new THREE.BoxGeometry(0.07, 0.07, 0.035),
  limb: new THREE.BoxGeometry(0.2, 0.7, 0.22),
  heavyLimb: new THREE.BoxGeometry(0.28, 0.74, 0.3),
  boot: new THREE.BoxGeometry(0.28, 0.22, 0.42),
  fang: new THREE.BoxGeometry(0.055, 0.11, 0.045),
  scarf: new THREE.TorusGeometry(0.3, 0.055, 5, 12, Math.PI * 1.5),
  wing: new THREE.BufferGeometry()
    .setFromPoints([
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.82, 0.1, -0.03),
      new THREE.Vector3(0.42, -0.34, 0.02),
      new THREE.Vector3(0.18, -0.12, 0.01),
    ])
    .setIndex([0, 1, 2, 0, 2, 3]),
  shield: new THREE.CylinderGeometry(0.55, 0.46, 0.12, 7),
  aura: new THREE.RingGeometry(5.3, 5.5, 40),
  mouth: new THREE.TorusGeometry(0.15, 0.045, 5, 10),
  drainRing: new THREE.TorusGeometry(0.62, 0.045, 5, 18),
  whistle: new THREE.CapsuleGeometry(0.045, 0.12, 2, 5),
  whistleRing: new THREE.TorusGeometry(0.74, 0.055, 5, 20),
  glove: new THREE.BoxGeometry(0.5, 0.5, 0.42),
  catchRing: new THREE.TorusGeometry(1.02, 0.07, 6, 24),
  bow: new THREE.TorusGeometry(0.52, 0.045, 5, 16, Math.PI * 1.35),
  veil: new THREE.ConeGeometry(0.48, 1.18, 8, 1, true),
  specialRing: new THREE.RingGeometry(0.7, 0.85, 20),
  bomberRing: new THREE.RingGeometry(1.35, 1.5, 24),
  fuse: new THREE.TorusGeometry(0.16, 0.035, 4, 10, Math.PI * 1.25),
  silhouetteWing: new THREE.ConeGeometry(0.24, 0.9, 3),
  silhouetteCape: new THREE.ConeGeometry(0.5, 1.35, 7),
  tacticalBoard: new THREE.BoxGeometry(0.36, 0.48, 0.07),
  bombPack: new THREE.SphereGeometry(0.34, 7, 5),
};

const material = {
  skin: new THREE.MeshStandardMaterial({ color: 0xbcaab1, roughness: 0.82 }),
  eyes: new THREE.MeshBasicMaterial({ color: 0xff174f }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15121c, roughness: 0.84 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd7ad37, roughness: 0.38, metalness: 0.35 }),
  pale: new THREE.MeshStandardMaterial({ color: 0xe0d8cf, roughness: 0.65 }),
  wing: new THREE.MeshStandardMaterial({ color: 0x8e285d, roughness: 0.72, side: THREE.DoubleSide }),
  cueGold: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
  }),
  cueViolet: new THREE.MeshBasicMaterial({
    color: 0x8d6ad2,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  cueDanger: new THREE.MeshBasicMaterial({
    color: 0xff6a3d,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  aura: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};

const kitMaterials = new Map<EnemyArchetype, THREE.MeshStandardMaterial>();
const accentMaterials = new Map<EnemyArchetype, THREE.MeshStandardMaterial>();
const farGeometries = new Map<EnemyArchetype, THREE.BufferGeometry>();
const midBodyGeometries = new Map<EnemyArchetype, THREE.BufferGeometry>();
const signatureGeometries = new Map<EnemyArchetype, THREE.BufferGeometry>();

function kitMaterial(archetype: EnemyArchetype): THREE.MeshStandardMaterial {
  let result = kitMaterials.get(archetype);
  if (!result) {
    result = new THREE.MeshStandardMaterial({ color: STYLES[archetype].kit, roughness: 0.72 });
    kitMaterials.set(archetype, result);
  }
  return result;
}

function accentMaterial(archetype: EnemyArchetype): THREE.MeshStandardMaterial {
  let result = accentMaterials.get(archetype);
  if (!result) {
    result = new THREE.MeshStandardMaterial({ color: STYLES[archetype].accent, roughness: 0.58 });
    accentMaterials.set(archetype, result);
  }
  return result;
}

function mesh(source: THREE.BufferGeometry, surface: THREE.Material, name: string): THREE.Mesh {
  const result = new THREE.Mesh(source, surface);
  result.name = name;
  result.castShadow = true;
  return result;
}

function transformed(source: THREE.BufferGeometry, transform: THREE.Matrix4): THREE.BufferGeometry {
  return source.clone().applyMatrix4(transform);
}

function transformMatrix(
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
): THREE.Matrix4 {
  const object = new THREE.Object3D();
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.updateMatrix();
  return object.matrix;
}

function baseSilhouettePieces(archetype: EnemyArchetype): THREE.BufferGeometry[] {
  if (archetype === 'batSwarm') {
    return [transformed(geometry.head, transformMatrix([0, 0.86, 0], [0, 0, 0], [1.15, 0.72, 1.25]))];
  }
  return [
    transformed(geometry.torso, transformMatrix([0, 1.1, 0])),
    transformed(geometry.head, transformMatrix([0, 1.93, 0])),
    transformed(geometry.limb, transformMatrix([-0.43, 1.13, 0], [0, 0, 0.13])),
    transformed(geometry.limb, transformMatrix([0.43, 1.13, 0], [0, 0, -0.13])),
    transformed(geometry.limb, transformMatrix([-0.2, 0.38, 0])),
    transformed(geometry.limb, transformMatrix([0.2, 0.38, 0])),
  ];
}

function signatureSilhouettePieces(archetype: EnemyArchetype): THREE.BufferGeometry[] {
  switch (archetype) {
    case 'bloodFan':
      return [transformed(geometry.silhouetteCape, transformMatrix([0, 0.9, -0.12]))];
    case 'winger':
      return [
        transformed(geometry.silhouetteWing, transformMatrix([-0.55, 1.28, -0.08], [0, 0, -1.05])),
        transformed(geometry.silhouetteWing, transformMatrix([0.55, 1.28, -0.08], [0, 0, 1.05])),
      ];
    case 'defender':
      return [
        transformed(geometry.shield, transformMatrix([0, 1.08, 0.38], [Math.PI / 2, 0, 0], [0.9, 0.9, 0.6])),
      ];
    case 'coach':
      return [transformed(geometry.tacticalBoard, transformMatrix([0.46, 1.22, 0.25], [0, 0, -0.12]))];
    case 'batSwarm':
      return [
        transformed(geometry.silhouetteWing, transformMatrix([-0.48, 0.88, 0], [0, 0, -1.2], [1.15, 1, 1])),
        transformed(geometry.silhouetteWing, transformMatrix([0.48, 0.88, 0], [0, 0, 1.2], [1.15, 1, 1])),
        transformed(geometry.fang, transformMatrix([-0.1, 1.12, 0])),
        transformed(geometry.fang, transformMatrix([0.1, 1.12, 0])),
      ];
    case 'leechStriker':
      return [
        transformed(
          geometry.mouth,
          transformMatrix([0, 1.75, 0.23], [Math.PI / 2, 0, 0], [1.25, 1.25, 1.25]),
        ),
      ];
    case 'corruptReferee':
      return [
        transformed(
          geometry.whistle,
          transformMatrix([0.16, 1.52, 0.26], [Math.PI / 2, 0, 0], [1.5, 1.5, 1.5]),
        ),
      ];
    case 'bloodArcher':
      return [transformed(geometry.bow, transformMatrix([0.48, 1.2, 0.12], [Math.PI / 2, 0, -0.15]))];
    case 'shadowRunner':
      return [transformed(geometry.veil, transformMatrix([0, 1.14, -0.06]))];
    case 'corpseBomber':
      return [
        transformed(geometry.bombPack, transformMatrix([0, 1.15, -0.32])),
        transformed(geometry.fuse, transformMatrix([0.18, 1.62, -0.2], [0, 0, -0.25])),
      ];
    case 'goalkeeperBrute':
      return [
        transformed(geometry.glove, transformMatrix([-0.62, 1.13, 0.16], [0, 0, 0], [1.2, 1.2, 1.2])),
        transformed(geometry.glove, transformMatrix([0.62, 1.13, 0.16], [0, 0, 0], [1.2, 1.2, 1.2])),
      ];
  }
}

function mergeAndScale(pieces: THREE.BufferGeometry[], archetype: EnemyArchetype): THREE.BufferGeometry {
  const style = STYLES[archetype];
  const scale = new THREE.Matrix4().makeScale(style.scale[0], style.scale[1], style.scale[2]);
  const result = mergeGeometries(pieces, false) ?? geometry.torso.clone();
  result.applyMatrix4(scale);
  result.userData.visualStyle = 'voxel-block-built';
  result.userData.bodyPrimitive = 'box';
  for (const piece of pieces) piece.dispose();
  return result;
}

function midBodyGeometry(archetype: EnemyArchetype): THREE.BufferGeometry {
  let result = midBodyGeometries.get(archetype);
  if (result) return result;
  result = mergeAndScale(baseSilhouettePieces(archetype), archetype);
  midBodyGeometries.set(archetype, result);
  return result;
}

function signatureGeometry(archetype: EnemyArchetype): THREE.BufferGeometry {
  let result = signatureGeometries.get(archetype);
  if (result) return result;
  result = mergeAndScale(signatureSilhouettePieces(archetype), archetype);
  signatureGeometries.set(archetype, result);
  return result;
}

function farGeometry(archetype: EnemyArchetype): THREE.BufferGeometry {
  let result = farGeometries.get(archetype);
  if (result) return result;
  result = mergeAndScale(
    [...baseSilhouettePieces(archetype), ...signatureSilhouettePieces(archetype)],
    archetype,
  );
  farGeometries.set(archetype, result);
  return result;
}

function addFace(near: THREE.Group, archetype: EnemyArchetype): void {
  const head = mesh(geometry.head, material.skin, `${prefixFor(archetype)}-head`);
  head.position.y = 1.92;
  head.userData.anatomyPrimitive = 'box';
  near.add(head);
  for (const side of [-1, 1]) {
    const eye = mesh(geometry.eyes, material.eyes, `${prefixFor(archetype)}-eye`);
    eye.position.set(side * 0.09, 1.96, 0.225);
    eye.castShadow = false;
    eye.userData.anatomyPrimitive = 'box';
    near.add(eye);
    const fang = mesh(geometry.fang, material.pale, `${prefixFor(archetype)}-fang`);
    fang.position.set(side * 0.065, 1.82, 0.235);
    fang.rotation.x = Math.PI;
    fang.userData.anatomyPrimitive = 'box';
    near.add(fang);
  }
}

function prefixFor(archetype: EnemyArchetype): string {
  switch (archetype) {
    case 'bloodFan':
      return 'blood-fan';
    case 'leechStriker':
      return 'leech';
    case 'corruptReferee':
      return 'referee';
    case 'goalkeeperBrute':
      return 'brute';
    case 'bloodArcher':
      return 'archer';
    case 'shadowRunner':
      return 'shadow';
    case 'corpseBomber':
      return 'bomber';
    case 'batSwarm':
      return 'bat';
    default:
      return archetype;
  }
}

function createHumanoid(
  archetype: EnemyArchetype,
  near: THREE.Group,
): Pick<EnemyCharacterPresentation, 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'> {
  const style = STYLES[archetype];
  const prefix = prefixFor(archetype);
  const torso = mesh(geometry.torso, kitMaterial(archetype), `${prefix}-body`);
  if (archetype === 'bloodFan') torso.name = 'blood-fan-cloak';
  torso.position.y = 1.12;
  torso.scale.set(1.08, 1, 0.84);
  torso.userData.anatomyPrimitive = 'box';
  near.add(torso);
  addFace(near, archetype);

  const limbGeometry = style.stance === 'heavy' ? geometry.heavyLimb : geometry.limb;
  const leftArm = limbPivot('left-arm', -0.4, 1.46, limbGeometry, kitMaterial(archetype), -0.08);
  const rightArm = limbPivot('right-arm', 0.4, 1.46, limbGeometry, kitMaterial(archetype), 0.08);
  const legSpread = style.stance === 'heavy' ? 0.24 : style.stance === 'fast' ? 0.16 : 0.2;
  const leftLeg = limbPivot('left-leg', -legSpread, 0.75, limbGeometry, material.dark, 0);
  const rightLeg = limbPivot('right-leg', legSpread, 0.75, limbGeometry, material.dark, 0);
  leftLeg.add(boot(-0.43));
  rightLeg.add(boot(-0.43));
  near.add(leftArm, rightArm, leftLeg, rightLeg);
  near.scale.set(...style.scale);
  if (style.stance === 'hunched') near.rotation.x = -0.16;
  return { leftArm, rightArm, leftLeg, rightLeg };
}

function limbPivot(
  name: string,
  x: number,
  y: number,
  source: THREE.BufferGeometry,
  surface: THREE.Material,
  roll: number,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = `enemy-joint-${name}`;
  pivot.position.set(x, y, 0);
  pivot.rotation.z = roll;
  const limb = mesh(source, surface, `enemy-limb-${name}`);
  limb.position.y = -0.32;
  limb.userData.anatomyPrimitive = 'box';
  pivot.add(limb);
  return pivot;
}

function boot(y: number): THREE.Mesh {
  const result = mesh(geometry.boot, material.dark, 'enemy-boot');
  result.position.set(0, y, 0.08);
  result.rotation.x = Math.PI / 2;
  result.userData.anatomyPrimitive = 'box';
  return result;
}

function addArchetypeEquipment(
  archetype: EnemyArchetype,
  near: THREE.Group,
  result: EnemyCharacterBuilder,
): void {
  if (archetype === 'bloodFan') {
    const scarf = mesh(geometry.scarf, accentMaterial(archetype), 'blood-fan-scarf');
    scarf.position.y = 1.65;
    scarf.rotation.x = Math.PI / 2;
    near.add(scarf);
  } else if (archetype === 'winger') {
    const left = mesh(geometry.wing, material.wing, 'winger-wing-left');
    const right = mesh(geometry.wing, material.wing, 'winger-wing-right');
    left.position.set(-0.26, 1.48, -0.14);
    right.position.set(0.26, 1.48, -0.14);
    left.scale.x = -1;
    result.leftWing = left;
    result.rightWing = right;
    near.add(left, right);
  } else if (archetype === 'defender') {
    const shield = mesh(geometry.shield, accentMaterial(archetype), 'defender-shield');
    shield.position.set(0, 1.08, 0.42);
    shield.rotation.x = Math.PI / 2;
    shield.scale.set(1, 1, 0.72);
    result.shield = shield;
    near.add(shield);
  } else if (archetype === 'coach') {
    const board = mesh(geometry.tacticalBoard, accentMaterial(archetype), 'coach-tactical-board');
    board.position.set(0.46, 1.22, 0.25);
    board.rotation.z = -0.12;
    const aura = cue(geometry.aura, material.aura, 'coach-aura', 0.035);
    result.aura = aura;
    near.add(board, aura);
  } else if (archetype === 'leechStriker') {
    const mouth = mesh(geometry.mouth, material.pale, 'leech-mouth');
    mouth.position.set(0, 1.79, 0.25);
    mouth.rotation.x = Math.PI / 2;
    const ring = cue(geometry.drainRing, material.cueGold, 'leech-drain-ring', 0.08);
    ring.visible = false;
    result.mouth = mouth;
    result.drainRing = ring;
    near.add(mouth, ring);
  } else if (archetype === 'corruptReferee') {
    const stripes = mesh(geometry.scarf, material.pale, 'referee-stripes');
    stripes.position.y = 1.26;
    stripes.scale.set(1.2, 1.8, 1);
    const whistle = mesh(geometry.whistle, material.gold, 'referee-whistle');
    whistle.position.set(0, 1.52, 0.36);
    whistle.rotation.x = Math.PI / 2;
    const ring = cue(geometry.whistleRing, material.cueGold, 'referee-whistle-ring', 0.08);
    ring.visible = false;
    result.whistle = whistle;
    result.whistleRing = ring;
    near.add(stripes, whistle, ring);
  } else if (archetype === 'goalkeeperBrute') {
    const left = mesh(geometry.glove, material.pale, 'brute-glove-left');
    const right = mesh(geometry.glove, material.pale, 'brute-glove-right');
    left.position.set(-0.92, 1.02, 0.28);
    right.position.set(0.92, 1.02, 0.28);
    const ring = mesh(geometry.catchRing, material.cueGold, 'brute-catch-ring');
    ring.position.set(0, 1.05, 0.48);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
    ring.visible = false;
    result.leftGlove = left;
    result.rightGlove = right;
    result.catchRing = ring;
    near.add(left, right, ring);
  } else if (archetype === 'bloodArcher') {
    const bow = mesh(geometry.bow, material.gold, 'archer-bow');
    bow.position.set(0.48, 1.17, 0.24);
    bow.rotation.set(Math.PI / 2, 0, -0.15);
    result.weapon = bow;
    near.add(bow);
  } else if (archetype === 'shadowRunner') {
    const veil = mesh(geometry.veil, material.cueViolet, 'shadow-veil');
    veil.position.y = 1.12;
    const ring = cue(geometry.specialRing, material.cueViolet, 'shadow-teleport-ring', 0.06);
    ring.visible = false;
    result.specialRing = ring;
    near.add(veil, ring);
  } else if (archetype === 'corpseBomber') {
    const fuse = mesh(geometry.fuse, material.cueDanger, 'bomber-fuse');
    fuse.position.set(0.22, 1.7, 0);
    const ring = cue(geometry.bomberRing, material.cueDanger, 'bomber-blast-ring', 0.055);
    ring.visible = false;
    result.weapon = fuse;
    result.specialRing = ring;
    near.add(fuse, ring);
  }
}

function createBatSwarm(near: THREE.Group, result: EnemyCharacterBuilder): void {
  const body = mesh(geometry.head, kitMaterial('batSwarm'), 'bat-body');
  body.position.y = 0.82;
  body.scale.set(1.2, 0.72, 1.3);
  body.userData.anatomyPrimitive = 'box';
  const left = mesh(geometry.wing, material.wing, 'bat-wing-left');
  const right = mesh(geometry.wing, material.wing, 'bat-wing-right');
  left.position.set(-0.14, 0.88, 0);
  right.position.set(0.14, 0.88, 0);
  left.scale.x = -1;
  const ears = new THREE.Group();
  ears.name = 'bat-ears';
  for (const side of [-1, 1]) {
    const ear = mesh(geometry.fang, kitMaterial('batSwarm'), 'bat-ear');
    ear.position.set(side * 0.1, 1.08, 0);
    ear.userData.anatomyPrimitive = 'box';
    ears.add(ear);
  }
  result.leftWing = left;
  result.rightWing = right;
  near.add(body, left, right, ears);
}

function cue(source: THREE.BufferGeometry, surface: THREE.Material, name: string, y: number): THREE.Mesh {
  const result = mesh(source, surface, name);
  result.position.y = y;
  result.rotation.x = -Math.PI / 2;
  result.castShadow = false;
  return result;
}

export function createEnemyCharacterPresentation(archetype: EnemyArchetype): EnemyCharacterPresentation {
  const lodRoot = new THREE.Group();
  lodRoot.name = 'enemy-character-lods';
  lodRoot.userData.enemySilhouette = ENEMY_VISUAL_IDENTITIES[archetype].silhouette;
  lodRoot.userData.enemySignatureEquipment = ENEMY_VISUAL_IDENTITIES[archetype].signatureEquipment;
  const near = new THREE.Group();
  near.name = 'enemy-lod-near';
  const mid = new THREE.Group();
  mid.name = 'enemy-lod-mid';
  const far = new THREE.Group();
  far.name = 'enemy-lod-far';
  lodRoot.add(near, mid, far);
  const proceduralBody = new THREE.Group();
  proceduralBody.name = 'enemy-procedural-body';
  proceduralBody.userData.visualStyle = 'voxel-block-built';
  near.add(proceduralBody);

  const result: EnemyCharacterBuilder = {};
  if (archetype === 'batSwarm') createBatSwarm(proceduralBody, result);
  else Object.assign(result, createHumanoid(archetype, proceduralBody));
  addArchetypeEquipment(archetype, near, result);

  const midMesh = mesh(
    midBodyGeometry(archetype),
    kitMaterial(archetype),
    `${prefixFor(archetype)}-mid-silhouette`,
  );
  midMesh.scale.set(1, 1, 0.9);
  const midSignature = mesh(
    signatureGeometry(archetype),
    accentMaterial(archetype),
    `${prefixFor(archetype)}-mid-signature`,
  );
  midSignature.scale.set(1, 1, 0.9);
  mid.add(midMesh, midSignature);
  const farMesh = mesh(
    farGeometry(archetype),
    kitMaterial(archetype),
    `${prefixFor(archetype)}-far-silhouette`,
  );
  farMesh.castShadow = false;
  far.add(farMesh);

  const presentation: EnemyCharacterPresentation = {
    ...result,
    lodRoot,
    proceduralBody,
    near,
    mid,
    far,
    lod: 'near',
    lastPoseAt: Number.NEGATIVE_INFINITY,
  };
  setEnemyVisualLod(presentation, 'near');
  return presentation;
}

export function chooseEnemyVisualLod(distanceSquared: number, quality: RenderQuality): EnemyVisualLod {
  const [nearDistance, midDistance] =
    quality === 'quality' ? [18, 38] : quality === 'performance' ? [9, 23] : [14, 31];
  if (distanceSquared <= nearDistance * nearDistance) return 'near';
  if (distanceSquared <= midDistance * midDistance) return 'mid';
  return 'far';
}

export function setEnemyVisualLod(presentation: EnemyCharacterPresentation, lod: EnemyVisualLod): void {
  presentation.lod = lod;
  presentation.near.visible = lod === 'near';
  presentation.mid.visible = lod === 'mid';
  presentation.far.visible = lod === 'far';
}

function attackAmount(state: EnemyAttackState): number {
  if (state === 'lunge' || state === 'drain' || state === 'volley') return 1;
  if (state === 'telegraph' || state === 'whistle' || state === 'fuse') return 0.55;
  if (state === 'recover') return -0.3;
  return 0;
}

/** Updates only render pivots. Far silhouettes deliberately receive no per-frame pose work. */
export function updateEnemyCharacterPose(
  presentation: EnemyCharacterPresentation,
  elapsed: number,
  enemyId: number,
  moving: boolean,
  attackState: EnemyAttackState,
  hit: boolean,
): void {
  if (presentation.lod === 'far') return;
  const interval = presentation.lod === 'near' ? 1 / 30 : 1 / 12;
  if (elapsed - presentation.lastPoseAt < interval) return;
  presentation.lastPoseAt = elapsed;
  const stride = moving ? Math.sin((elapsed + enemyId * 0.37) * 8) : 0;
  const strike = attackAmount(attackState);
  const recoil = hit ? -0.75 : 0;
  if (presentation.leftArm) presentation.leftArm.rotation.x = -stride * 0.65 + recoil;
  if (presentation.rightArm) presentation.rightArm.rotation.x = stride * 0.65 - strike * 1.05 + recoil;
  if (presentation.leftLeg) presentation.leftLeg.rotation.x = stride * 0.72;
  if (presentation.rightLeg) presentation.rightLeg.rotation.x = -stride * 0.72 + strike * 0.28;
  presentation.near.position.y = moving
    ? Math.abs(stride) * 0.035
    : Math.sin(elapsed * 2.1 + enemyId) * 0.012;
  presentation.mid.rotation.z = moving ? stride * 0.02 : 0;
}

export function disposeEnemyCharacterResources(): void {
  for (const value of Object.values(geometry)) value.dispose();
  for (const value of Object.values(material)) value.dispose();
  for (const value of kitMaterials.values()) value.dispose();
  for (const value of accentMaterials.values()) value.dispose();
  for (const value of farGeometries.values()) value.dispose();
  for (const value of midBodyGeometries.values()) value.dispose();
  for (const value of signatureGeometries.values()) value.dispose();
}
