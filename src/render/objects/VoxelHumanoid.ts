import * as THREE from 'three';

export type VoxelFacialStyle = 'focused' | 'fierce' | 'calm' | 'masked';
export type VoxelHairStyle = 'none' | 'crop' | 'swept' | 'crest';

export interface VoxelHumanoidColors {
  readonly skin: THREE.ColorRepresentation;
  readonly kitPrimary: THREE.ColorRepresentation;
  readonly kitSecondary: THREE.ColorRepresentation;
  readonly shorts: THREE.ColorRepresentation;
  readonly socks: THREE.ColorRepresentation;
  readonly boots: THREE.ColorRepresentation;
  readonly hair: THREE.ColorRepresentation;
  readonly eyes: THREE.ColorRepresentation;
  readonly accent: THREE.ColorRepresentation;
}

/**
 * Dimensions are expressed in scene units. The default athlete stands 2.4
 * units tall and faces the positive Z axis.
 */
export interface VoxelHumanoidProportions {
  readonly torsoHeight: number;
  readonly torsoWidth: number;
  readonly torsoDepth: number;
  readonly pelvisHeight: number;
  readonly pelvisWidth: number;
  readonly upperArmLength: number;
  readonly lowerArmLength: number;
  readonly armThickness: number;
  readonly upperLegLength: number;
  readonly lowerLegLength: number;
  readonly legThickness: number;
  readonly headSize: number;
  readonly footHeight: number;
  readonly footLength: number;
}

export interface VoxelHumanoidAccessories {
  readonly hair?: VoxelHairStyle;
  readonly wristbands?: boolean;
  readonly shoulderPads?: boolean;
  readonly shinGuards?: boolean;
}

export interface VoxelHumanoidOptions {
  readonly colors?: Partial<VoxelHumanoidColors>;
  readonly proportions?: Partial<VoxelHumanoidProportions>;
  readonly facialStyle?: VoxelFacialStyle;
  readonly accessories?: VoxelHumanoidAccessories;
  readonly castShadow?: boolean;
  readonly namePrefix?: string;
}

export interface VoxelHumanoidPaletteUpdate {
  readonly primary?: THREE.ColorRepresentation;
  readonly secondary?: THREE.ColorRepresentation;
  readonly shorts?: THREE.ColorRepresentation;
  readonly socks?: THREE.ColorRepresentation;
  readonly boots?: THREE.ColorRepresentation;
  readonly skin?: THREE.ColorRepresentation;
  readonly hair?: THREE.ColorRepresentation;
  readonly eyes?: THREE.ColorRepresentation;
  readonly accent?: THREE.ColorRepresentation;
  /** Alias accepted for callers using the creation-palette vocabulary. */
  readonly kitPrimary?: THREE.ColorRepresentation;
  /** Alias accepted for callers using the creation-palette vocabulary. */
  readonly kitSecondary?: THREE.ColorRepresentation;
}

export interface VoxelHumanoidJoints {
  readonly pelvis: THREE.Group;
  readonly torso: THREE.Group;
  readonly head: THREE.Group;
  readonly leftUpperArm: THREE.Group;
  readonly leftLowerArm: THREE.Group;
  readonly leftHand: THREE.Group;
  readonly rightUpperArm: THREE.Group;
  readonly rightLowerArm: THREE.Group;
  readonly rightHand: THREE.Group;
  readonly leftUpperLeg: THREE.Group;
  readonly leftLowerLeg: THREE.Group;
  readonly leftFoot: THREE.Group;
  readonly rightUpperLeg: THREE.Group;
  readonly rightLowerLeg: THREE.Group;
  readonly rightFoot: THREE.Group;
}

export interface VoxelHumanoidSockets {
  readonly leftHand: THREE.Group;
  readonly rightHand: THREE.Group;
  readonly head: THREE.Group;
  readonly back: THREE.Group;
  readonly leftFoot: THREE.Group;
  readonly rightFoot: THREE.Group;
}

export default interface VoxelHumanoid {
  readonly root: THREE.Group;
  readonly joints: VoxelHumanoidJoints;
  readonly pelvis: THREE.Group;
  readonly torso: THREE.Group;
  readonly head: THREE.Group;
  readonly leftUpperArm: THREE.Group;
  readonly leftLowerArm: THREE.Group;
  readonly leftHand: THREE.Group;
  readonly rightUpperArm: THREE.Group;
  readonly rightLowerArm: THREE.Group;
  readonly rightHand: THREE.Group;
  readonly leftUpperLeg: THREE.Group;
  readonly leftLowerLeg: THREE.Group;
  readonly leftFoot: THREE.Group;
  readonly rightUpperLeg: THREE.Group;
  readonly rightLowerLeg: THREE.Group;
  readonly rightFoot: THREE.Group;
  readonly sockets: VoxelHumanoidSockets;
  /** Recolors this athlete without rebuilding its hierarchy or affecting shared instances. */
  readonly setPalette: (palette: VoxelHumanoidPaletteUpdate) => void;
  /** Releases this instance's references to shared geometries and materials. */
  readonly dispose: () => void;
}

export type { VoxelHumanoid };

const DEFAULT_COLORS: VoxelHumanoidColors = Object.freeze({
  skin: 0xa96852,
  kitPrimary: 0x8d1438,
  kitSecondary: 0xf0d7a1,
  shorts: 0x201a2a,
  socks: 0xe7dfcf,
  boots: 0x17131d,
  hair: 0x261a19,
  eyes: 0x24171c,
  accent: 0xefb83f,
});

const DEFAULT_PROPORTIONS: VoxelHumanoidProportions = Object.freeze({
  torsoHeight: 0.66,
  torsoWidth: 0.64,
  torsoDepth: 0.3,
  pelvisHeight: 0.25,
  pelvisWidth: 0.48,
  upperArmLength: 0.4,
  lowerArmLength: 0.38,
  armThickness: 0.18,
  upperLegLength: 0.49,
  lowerLegLength: 0.46,
  legThickness: 0.22,
  headSize: 0.43,
  footHeight: 0.16,
  footLength: 0.4,
});

interface SharedResource<T extends { dispose(): void }> {
  readonly value: T;
  references: number;
}

const geometryCache = new Map<string, SharedResource<THREE.BoxGeometry>>();
const materialCache = new Map<string, SharedResource<THREE.MeshStandardMaterial>>();

function acquireGeometry(
  width: number,
  height: number,
  depth: number,
): readonly [THREE.BoxGeometry, () => void] {
  const key = `${width.toFixed(4)}:${height.toFixed(4)}:${depth.toFixed(4)}`;
  let entry = geometryCache.get(key);
  if (!entry) {
    entry = { value: new THREE.BoxGeometry(width, height, depth), references: 0 };
    geometryCache.set(key, entry);
  }
  entry.references += 1;
  let released = false;
  return [
    entry.value,
    () => {
      if (released) return;
      released = true;
      entry!.references -= 1;
      if (entry!.references === 0) {
        entry!.value.dispose();
        geometryCache.delete(key);
      }
    },
  ];
}

function acquireMaterial(
  color: THREE.ColorRepresentation,
  roughness = 0.72,
  metalness = 0,
): readonly [THREE.MeshStandardMaterial, () => void] {
  const normalizedColor = new THREE.Color(color);
  const key = `${normalizedColor.getHexString()}:${roughness.toFixed(3)}:${metalness.toFixed(3)}`;
  let entry = materialCache.get(key);
  if (!entry) {
    entry = {
      value: new THREE.MeshStandardMaterial({ color: normalizedColor, roughness, metalness }),
      references: 0,
    };
    materialCache.set(key, entry);
  }
  entry.references += 1;
  let released = false;
  return [
    entry.value,
    () => {
      if (released) return;
      released = true;
      entry!.references -= 1;
      if (entry!.references === 0) {
        entry!.value.dispose();
        materialCache.delete(key);
      }
    },
  ];
}

function positiveDimension(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolvedProportions(
  requested: Partial<VoxelHumanoidProportions> | undefined,
): VoxelHumanoidProportions {
  const result = {} as Record<keyof VoxelHumanoidProportions, number>;
  for (const key of Object.keys(DEFAULT_PROPORTIONS) as (keyof VoxelHumanoidProportions)[]) {
    result[key] = positiveDimension(requested?.[key], DEFAULT_PROPORTIONS[key]);
  }
  return result;
}

function namedGroup(prefix: string, role: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `${prefix}-${role}`;
  group.userData.rigPart = role;
  return group;
}

/**
 * Builds an original block-football athlete from lightweight shared resources.
 * Joint groups pivot at anatomical attachment points, so animation code can
 * rotate limbs without compensating for mesh centers.
 */
export function createVoxelHumanoid(options: VoxelHumanoidOptions = {}): VoxelHumanoid {
  const prefix = options.namePrefix?.trim() || 'voxel-athlete';
  const colors: VoxelHumanoidColors = { ...DEFAULT_COLORS, ...options.colors };
  const p = resolvedProportions(options.proportions);
  const accessories: Required<VoxelHumanoidAccessories> = {
    hair: options.accessories?.hair ?? 'crop',
    wristbands: options.accessories?.wristbands ?? true,
    shoulderPads: options.accessories?.shoulderPads ?? false,
    shinGuards: options.accessories?.shinGuards ?? true,
  };
  const facialStyle = options.facialStyle ?? 'focused';
  const castShadow = options.castShadow ?? true;
  const releases: (() => void)[] = [];
  const materialReleases = new Map<THREE.Mesh, () => void>();

  const root = namedGroup(prefix, 'root');
  root.userData.visualRole = 'voxel-humanoid';
  root.userData.visualStyle = 'original-block-football';
  root.userData.rigType = 'voxel-humanoid-v1';
  root.userData.forwardAxis = '+z';
  root.userData.facialStyle = facialStyle;
  root.userData.hairStyle = accessories.hair;
  root.userData.procedurallyAuthored = true;

  const createBox = (
    parent: THREE.Object3D,
    role: string,
    dimensions: readonly [number, number, number],
    color: THREE.ColorRepresentation,
    position: readonly [number, number, number] = [0, 0, 0],
    roughness = 0.72,
    metalness = 0,
  ): THREE.Mesh => {
    const [geometry, releaseGeometry] = acquireGeometry(...dimensions);
    const [material, releaseMaterial] = acquireMaterial(color, roughness, metalness);
    releases.push(releaseGeometry, releaseMaterial);
    const result = new THREE.Mesh(geometry, material);
    result.name = `${prefix}-${role}-mesh`;
    result.position.set(...position);
    result.castShadow = castShadow;
    result.receiveShadow = true;
    result.userData.visualPart = role;
    result.userData.paletteRole = paletteRoleForPart(role);
    materialReleases.set(result, releaseMaterial);
    parent.add(result);
    return result;
  };

  const legTop = p.footHeight + p.lowerLegLength + p.upperLegLength + p.pelvisHeight / 2;
  const pelvis = namedGroup(prefix, 'pelvis');
  pelvis.position.y = legTop;
  root.add(pelvis);
  createBox(pelvis, 'pelvis', [p.pelvisWidth, p.pelvisHeight, p.torsoDepth * 0.9], colors.shorts);

  const torso = namedGroup(prefix, 'torso');
  torso.position.y = p.pelvisHeight / 2;
  pelvis.add(torso);
  createBox(torso, 'torso', [p.torsoWidth, p.torsoHeight, p.torsoDepth], colors.kitPrimary, [
    0,
    p.torsoHeight / 2,
    0,
  ]);
  createBox(
    torso,
    'chest-stripe',
    [p.torsoWidth * 0.22, p.torsoHeight * 0.96, p.torsoDepth + 0.012],
    colors.kitSecondary,
    [0, p.torsoHeight * 0.51, p.torsoDepth * 0.02],
  );

  const head = namedGroup(prefix, 'head');
  head.position.y = p.torsoHeight;
  torso.add(head);
  createBox(head, 'head', [p.headSize, p.headSize, p.headSize * 0.9], colors.skin, [
    0,
    p.headSize / 2 + 0.035,
    0,
  ]);

  const faceZ = p.headSize * 0.455;
  const eyeY = p.headSize * 0.59;
  const eyeTilt = facialStyle === 'fierce' ? 0.035 : facialStyle === 'calm' ? -0.015 : 0;
  const eyeHeight = facialStyle === 'masked' ? 0.075 : 0.045;
  createBox(head, 'left-eye', [0.065, eyeHeight, 0.018], colors.eyes, [
    -p.headSize * 0.19,
    eyeY + eyeTilt,
    faceZ,
  ]);
  createBox(head, 'right-eye', [0.065, eyeHeight, 0.018], colors.eyes, [
    p.headSize * 0.19,
    eyeY - eyeTilt,
    faceZ,
  ]);
  if (facialStyle === 'masked') {
    createBox(head, 'face-mask', [p.headSize * 0.76, p.headSize * 0.18, 0.02], colors.accent, [
      0,
      p.headSize * 0.36,
      faceZ + 0.003,
    ]);
  } else {
    const mouthWidth = facialStyle === 'fierce' ? p.headSize * 0.25 : p.headSize * 0.18;
    createBox(head, 'mouth', [mouthWidth, 0.025, 0.018], colors.eyes, [0, p.headSize * 0.32, faceZ]);
  }

  if (accessories.hair !== 'none') {
    const hairHeight = accessories.hair === 'crest' ? p.headSize * 0.28 : p.headSize * 0.14;
    const hairWidth = accessories.hair === 'swept' ? p.headSize * 0.78 : p.headSize * 0.92;
    const hairX = accessories.hair === 'swept' ? p.headSize * 0.1 : 0;
    createBox(head, 'hair', [hairWidth, hairHeight, p.headSize * 0.88], colors.hair, [
      hairX,
      p.headSize + hairHeight / 2 + 0.025,
      0,
    ]);
  }

  const buildArm = (side: 'left' | 'right') => {
    const sign = side === 'left' ? -1 : 1;
    const upper = namedGroup(prefix, `${side}-upper-arm`);
    upper.position.set(sign * (p.torsoWidth / 2 + p.armThickness / 2), p.torsoHeight * 0.86, 0);
    torso.add(upper);
    createBox(
      upper,
      `${side}-upper-arm`,
      [p.armThickness, p.upperArmLength, p.armThickness],
      colors.kitPrimary,
      [0, -p.upperArmLength / 2, 0],
    );
    if (accessories.shoulderPads) {
      createBox(
        upper,
        `${side}-shoulder-pad`,
        [p.armThickness * 1.35, p.armThickness * 0.7, p.armThickness * 1.25],
        colors.accent,
        [0, -p.armThickness * 0.2, 0],
        0.55,
        0.08,
      );
    }

    const lower = namedGroup(prefix, `${side}-lower-arm`);
    lower.position.y = -p.upperArmLength;
    upper.add(lower);
    createBox(
      lower,
      `${side}-lower-arm`,
      [p.armThickness * 0.88, p.lowerArmLength, p.armThickness * 0.88],
      colors.skin,
      [0, -p.lowerArmLength / 2, 0],
    );
    if (accessories.wristbands) {
      createBox(
        lower,
        `${side}-wristband`,
        [p.armThickness, p.armThickness * 0.38, p.armThickness],
        colors.accent,
        [0, -p.lowerArmLength * 0.82, 0],
      );
    }

    const hand = namedGroup(prefix, `${side}-hand`);
    hand.position.y = -p.lowerArmLength;
    lower.add(hand);
    createBox(
      hand,
      `${side}-hand`,
      [p.armThickness * 0.94, p.armThickness * 0.95, p.armThickness],
      colors.skin,
      [0, -p.armThickness * 0.45, 0],
    );
    const socket = namedGroup(prefix, `socket-${side}-hand`);
    socket.position.y = -p.armThickness * 0.95;
    hand.add(socket);
    return { upper, lower, hand, socket };
  };

  const buildLeg = (side: 'left' | 'right') => {
    const sign = side === 'left' ? -1 : 1;
    const upper = namedGroup(prefix, `${side}-upper-leg`);
    upper.position.set(sign * p.pelvisWidth * 0.27, -p.pelvisHeight / 2, 0);
    pelvis.add(upper);
    createBox(upper, `${side}-upper-leg`, [p.legThickness, p.upperLegLength, p.legThickness], colors.shorts, [
      0,
      -p.upperLegLength / 2,
      0,
    ]);

    const lower = namedGroup(prefix, `${side}-lower-leg`);
    lower.position.y = -p.upperLegLength;
    upper.add(lower);
    createBox(
      lower,
      `${side}-lower-leg`,
      [p.legThickness * 0.88, p.lowerLegLength, p.legThickness * 0.88],
      colors.socks,
      [0, -p.lowerLegLength / 2, 0],
    );
    if (accessories.shinGuards) {
      createBox(
        lower,
        `${side}-shin-guard`,
        [p.legThickness * 0.72, p.lowerLegLength * 0.42, 0.025],
        colors.kitSecondary,
        [0, -p.lowerLegLength * 0.5, p.legThickness * 0.46],
      );
    }

    const foot = namedGroup(prefix, `${side}-foot`);
    foot.position.y = -p.lowerLegLength;
    lower.add(foot);
    createBox(
      foot,
      `${side}-foot`,
      [p.legThickness * 1.12, p.footHeight, p.footLength],
      colors.boots,
      [0, -p.footHeight / 2, p.footLength * 0.22],
      0.48,
      0.06,
    );
    const socket = namedGroup(prefix, `socket-${side}-foot`);
    socket.position.set(0, -p.footHeight * 0.45, p.footLength * 0.55);
    foot.add(socket);
    return { upper, lower, foot, socket };
  };

  const leftArm = buildArm('left');
  const rightArm = buildArm('right');
  const leftLeg = buildLeg('left');
  const rightLeg = buildLeg('right');

  const headSocket = namedGroup(prefix, 'socket-head');
  headSocket.position.y = p.headSize + 0.05;
  head.add(headSocket);
  const backSocket = namedGroup(prefix, 'socket-back');
  backSocket.position.set(0, p.torsoHeight * 0.58, -p.torsoDepth / 2);
  torso.add(backSocket);

  const joints: VoxelHumanoidJoints = {
    pelvis,
    torso,
    head,
    leftUpperArm: leftArm.upper,
    leftLowerArm: leftArm.lower,
    leftHand: leftArm.hand,
    rightUpperArm: rightArm.upper,
    rightLowerArm: rightArm.lower,
    rightHand: rightArm.hand,
    leftUpperLeg: leftLeg.upper,
    leftLowerLeg: leftLeg.lower,
    leftFoot: leftLeg.foot,
    rightUpperLeg: rightLeg.upper,
    rightLowerLeg: rightLeg.lower,
    rightFoot: rightLeg.foot,
  };

  const setPalette = (update: VoxelHumanoidPaletteUpdate) => {
    if (disposed) return;
    const palette: Partial<Record<keyof VoxelHumanoidColors, THREE.ColorRepresentation>> = {
      skin: update.skin,
      kitPrimary: update.primary ?? update.kitPrimary,
      kitSecondary: update.secondary ?? update.kitSecondary,
      shorts: update.shorts,
      socks: update.socks,
      boots: update.boots,
      hair: update.hair,
      eyes: update.eyes,
      accent: update.accent,
    };
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const paletteRole = object.userData.paletteRole as keyof VoxelHumanoidColors | undefined;
      const color = paletteRole ? palette[paletteRole] : undefined;
      if (color === undefined) return;
      const previousMaterial = object.material as THREE.MeshStandardMaterial;
      const [nextMaterial, releaseNextMaterial] = acquireMaterial(
        color,
        previousMaterial.roughness,
        previousMaterial.metalness,
      );
      materialReleases.get(object)?.();
      object.material = nextMaterial;
      materialReleases.set(object, releaseNextMaterial);
      releases.push(releaseNextMaterial);
    });
  };

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    root.clear();
    for (const release of releases) release();
    root.userData.disposed = true;
  };

  return {
    root,
    joints,
    pelvis,
    torso,
    head,
    leftUpperArm: leftArm.upper,
    leftLowerArm: leftArm.lower,
    leftHand: leftArm.hand,
    rightUpperArm: rightArm.upper,
    rightLowerArm: rightArm.lower,
    rightHand: rightArm.hand,
    leftUpperLeg: leftLeg.upper,
    leftLowerLeg: leftLeg.lower,
    leftFoot: leftLeg.foot,
    rightUpperLeg: rightLeg.upper,
    rightLowerLeg: rightLeg.lower,
    rightFoot: rightLeg.foot,
    sockets: {
      leftHand: leftArm.socket,
      rightHand: rightArm.socket,
      head: headSocket,
      back: backSocket,
      leftFoot: leftLeg.socket,
      rightFoot: rightLeg.socket,
    },
    setPalette,
    dispose,
  };
}

function paletteRoleForPart(role: string): keyof VoxelHumanoidColors {
  if (role === 'hair') return 'hair';
  if (role.includes('eye') || role === 'mouth') return 'eyes';
  if (role === 'face-mask' || role.includes('shoulder-pad') || role.includes('wristband')) {
    return 'accent';
  }
  if (role === 'head' || role.includes('hand') || role.includes('lower-arm')) return 'skin';
  if (role === 'chest-stripe' || role.includes('shin-guard')) return 'kitSecondary';
  if (role === 'pelvis' || role.includes('upper-leg')) return 'shorts';
  if (role.includes('lower-leg')) return 'socks';
  if (role.includes('foot')) return 'boots';
  return 'kitPrimary';
}
