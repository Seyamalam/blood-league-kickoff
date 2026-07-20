import type * as THREE from 'three';
import type { CharacterId } from '../../game/characters';
import { VOXEL_PERSONALITIES, type VoxelPersonalityProfile } from './VoxelCharacterPresentation';
import type { VoxelHumanoid } from './VoxelHumanoid';

export type VoxelAnimationState =
  | 'idle'
  | 'dribble'
  | 'sprint'
  | 'strafeLeft'
  | 'strafeRight'
  | 'shoot'
  | 'groundPass'
  | 'lobPass'
  | 'header'
  | 'slideTackle'
  | 'bicycleKick'
  | 'damage'
  | 'knockdown'
  | 'celebration'
  | 'victory'
  | 'defeat'
  | 'attack'
  | 'chase'
  | 'hit';

type JointName = keyof VoxelHumanoid['joints'];

interface StateDefinition {
  readonly priority: number;
  readonly duration: number;
  readonly oneShot: boolean;
  readonly terminal?: boolean;
}

interface TransformSnapshot {
  readonly position: THREE.Vector3;
  readonly rotation: THREE.Euler;
}

interface JointRotation {
  x: number;
  y: number;
  z: number;
}

interface Pose {
  readonly rotations: Partial<Record<JointName, JointRotation>>;
  pelvisX: number;
  pelvisY: number;
  pelvisZ: number;
  leftFootY: number;
  rightFootY: number;
}

const TAU = Math.PI * 2;

const STATE_DEFINITIONS: Readonly<Record<VoxelAnimationState, StateDefinition>> = {
  idle: { priority: 0, duration: 1.25, oneShot: false },
  dribble: { priority: 10, duration: 0.72, oneShot: false },
  sprint: { priority: 12, duration: 0.54, oneShot: false },
  strafeLeft: { priority: 11, duration: 0.68, oneShot: false },
  strafeRight: { priority: 11, duration: 0.68, oneShot: false },
  chase: { priority: 12, duration: 0.58, oneShot: false },
  // Goal outcomes must replace the technique that produced the goal.
  celebration: { priority: 70, duration: 1.4, oneShot: true },
  attack: { priority: 45, duration: 0.52, oneShot: true },
  groundPass: { priority: 50, duration: 0.56, oneShot: true },
  lobPass: { priority: 52, duration: 0.72, oneShot: true },
  shoot: { priority: 55, duration: 0.68, oneShot: true },
  header: { priority: 58, duration: 0.62, oneShot: true },
  slideTackle: { priority: 60, duration: 0.9, oneShot: true },
  bicycleKick: { priority: 65, duration: 1.12, oneShot: true },
  damage: { priority: 75, duration: 0.38, oneShot: true },
  hit: { priority: 75, duration: 0.38, oneShot: true },
  knockdown: { priority: 90, duration: 1.15, oneShot: true },
  victory: { priority: 100, duration: 1.15, oneShot: true, terminal: true },
  defeat: { priority: 100, duration: 0.82, oneShot: true, terminal: true },
};

/**
 * Lightweight, render-only animation for the articulated voxel rig.
 *
 * It writes local joint transforms only. Game movement, hit timing, velocity,
 * and every other simulation concern remain owned by the simulation layer.
 */
export class VoxelAnimationController {
  private readonly bindPose = new Map<JointName, TransformSnapshot>();
  private active?: VoxelAnimationState;
  private locomotion: VoxelAnimationState = 'idle';
  private elapsed = 0;
  private locomotionElapsed = 0;
  private blendElapsed = 1;
  private blendDuration = 0.12;
  private displayedPose = emptyPose();
  private blendFromPose = emptyPose();
  private personality: VoxelPersonalityProfile = VOXEL_PERSONALITIES.maestro;
  private aimYaw = 0;
  private leftGroundHeight = 0;
  private rightGroundHeight = 0;
  private groundPitch = 0;
  private groundRoll = 0;
  private disposed = false;

  constructor(private readonly rig: VoxelHumanoid) {
    for (const [name, joint] of Object.entries(rig.joints) as [JointName, THREE.Group][]) {
      this.bindPose.set(name, {
        position: joint.position.clone(),
        rotation: joint.rotation.clone(),
      });
    }
  }

  get state(): VoxelAnimationState | undefined {
    return this.active;
  }

  get activeState(): VoxelAnimationState | undefined {
    return this.active;
  }

  get isLocked(): boolean {
    if (!this.active) return false;
    const definition = STATE_DEFINITIONS[this.active];
    return definition.oneShot || definition.terminal === true;
  }

  get isTerminal(): boolean {
    return this.active ? STATE_DEFINITIONS[this.active].terminal === true : false;
  }

  /** Selects the authored motion cadence while preserving the shared skeleton. */
  setPersonality(characterId: CharacterId): void {
    this.personality = VOXEL_PERSONALITIES[characterId];
  }

  /** Keeps locomotion advancing underneath compatible upper-body actions. */
  setLocomotion(
    state: Extract<
      VoxelAnimationState,
      'idle' | 'dribble' | 'sprint' | 'strafeLeft' | 'strafeRight' | 'chase'
    >,
  ): void {
    if (this.disposed) return;
    if (this.locomotion !== state) {
      this.locomotion = state;
      this.locomotionElapsed = 0;
    }
    if (!this.isLocked && this.active !== state) this.transitionTo(state);
  }

  /** Rotates the upper body toward aim while the pelvis and legs keep moving. */
  setAimYaw(radians: number): void {
    this.aimYaw = Number.isFinite(radians) ? Math.max(-0.8, Math.min(0.8, radians)) : 0;
  }

  /**
   * Receives render-only ground samples. Heights are relative to the rig root;
   * pitch and roll keep planted feet level on authored slopes.
   */
  setGrounding(
    leftHeight: number,
    rightHeight: number,
    normal: Readonly<{ x: number; y: number; z: number }> = { x: 0, y: 1, z: 0 },
  ): void {
    this.leftGroundHeight = Number.isFinite(leftHeight) ? leftHeight : 0;
    this.rightGroundHeight = Number.isFinite(rightHeight) ? rightHeight : 0;
    const safeY = Math.max(0.001, Math.abs(normal.y));
    this.groundPitch = Math.atan2(normal.z, safeY);
    this.groundRoll = -Math.atan2(normal.x, safeY);
  }

  /**
   * Requests a visual state. A locked one-shot can only be interrupted by a
   * higher-priority state; terminal states hold until reset.
   */
  play(state: VoxelAnimationState): boolean {
    if (this.disposed) return false;

    const current = this.active ? STATE_DEFINITIONS[this.active] : undefined;
    const next = STATE_DEFINITIONS[state];
    if (current?.terminal) return false;
    if (this.active === state) return true;
    if (current?.oneShot && next.priority < current.priority) return false;

    if (isLocomotionState(state)) {
      this.locomotion = state;
      this.locomotionElapsed = 0;
    }
    this.transitionTo(state);
    return true;
  }

  update(dt: number): void {
    if (this.disposed || !this.active) return;

    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const definition = STATE_DEFINITIONS[this.active];
    this.elapsed += step;
    this.locomotionElapsed += step * this.personality.actionSpeed;
    this.blendElapsed += step;
    this.rig.updateFace?.(step);

    if (definition.terminal) {
      const progress = clamp01(this.elapsed / definition.duration);
      this.applySample(this.active, progress);
      return;
    }

    if (definition.oneShot && this.elapsed >= definition.duration) {
      this.active = 'idle';
      this.locomotion = 'idle';
      this.elapsed = 0;
      this.beginBlend();
      this.applySample('idle', 0);
      return;
    }

    const progress = definition.oneShot
      ? clamp01(this.elapsed / definition.duration)
      : (this.elapsed % definition.duration) / definition.duration;
    this.applySample(this.active, progress);
  }

  reset(): void {
    this.active = undefined;
    this.locomotion = 'idle';
    this.elapsed = 0;
    this.locomotionElapsed = 0;
    this.displayedPose = emptyPose();
    this.blendFromPose = emptyPose();
    this.rig.setExpression?.('neutral');
    this.restoreBindPose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.bindPose.clear();
    this.disposed = true;
  }

  private applyPose(pose: Pose): void {
    for (const [name, joint] of Object.entries(this.rig.joints) as [JointName, THREE.Group][]) {
      const bind = this.bindPose.get(name);
      if (!bind) continue;
      const rotation = pose.rotations[name];
      joint.position.copy(bind.position);
      joint.rotation.copy(bind.rotation);
      if (rotation) {
        joint.rotation.x += rotation.x;
        joint.rotation.y += rotation.y;
        joint.rotation.z += rotation.z;
      }
    }

    const pelvis = this.rig.joints.pelvis;
    const bindPelvis = this.bindPose.get('pelvis');
    if (bindPelvis) {
      pelvis.position.set(
        bindPelvis.position.x + pose.pelvisX,
        bindPelvis.position.y + pose.pelvisY,
        bindPelvis.position.z + pose.pelvisZ,
      );
    }
    const leftFoot = this.rig.joints.leftFoot;
    const rightFoot = this.rig.joints.rightFoot;
    const bindLeftFoot = this.bindPose.get('leftFoot');
    const bindRightFoot = this.bindPose.get('rightFoot');
    if (bindLeftFoot) leftFoot.position.y = bindLeftFoot.position.y + pose.leftFootY;
    if (bindRightFoot) rightFoot.position.y = bindRightFoot.position.y + pose.rightFootY;
  }

  private transitionTo(state: VoxelAnimationState): void {
    this.beginBlend();
    this.active = state;
    this.elapsed = 0;
    this.blendDuration =
      state === 'damage' || state === 'hit'
        ? 0.055
        : state === 'knockdown'
          ? 0.075
          : isLocomotionState(state)
            ? 0.14
            : 0.09;
    this.applySample(state, 0);
  }

  private beginBlend(): void {
    this.blendFromPose = clonePose(this.displayedPose);
    this.blendElapsed = 0;
  }

  private applySample(state: VoxelAnimationState, progress: number): void {
    let sampled = samplePose(state, progress);
    if (shouldLayerLocomotion(state)) {
      const locomotionDefinition = STATE_DEFINITIONS[this.locomotion];
      const locomotionProgress =
        (this.locomotionElapsed % locomotionDefinition.duration) / locomotionDefinition.duration;
      sampled = layerUpperBody(samplePose(this.locomotion, locomotionProgress), sampled, state);
    }
    applyPersonality(sampled, this.personality, state);
    applyAimLayer(sampled, this.aimYaw, state);
    applyFootPlanting(
      sampled,
      state,
      this.leftGroundHeight,
      this.rightGroundHeight,
      this.groundPitch,
      this.groundRoll,
    );
    const blend = smoothstep(clamp01(this.blendElapsed / Math.max(0.001, this.blendDuration)));
    this.displayedPose = interpolatePose(this.blendFromPose, sampled, blend);
    this.applyPose(this.displayedPose);
    this.rig.setExpression?.(expressionForState(state));
  }

  private restoreBindPose(): void {
    for (const [name, joint] of Object.entries(this.rig.joints) as [JointName, THREE.Group][]) {
      const bind = this.bindPose.get(name);
      if (!bind) continue;
      joint.position.copy(bind.position);
      joint.rotation.copy(bind.rotation);
    }
  }
}

function samplePose(state: VoxelAnimationState, progress: number): Pose {
  const pose = emptyPose();
  const cycle = progress * TAU;
  const wave = Math.sin(cycle);
  const opposite = Math.sin(cycle + Math.PI);
  const action = Math.sin(Math.PI * easeInOutCubic(progress));

  switch (state) {
    case 'idle':
      rotate(pose, 'torso', wave * 0.025, 0, wave * 0.018);
      rotate(pose, 'head', -wave * 0.018, wave * 0.04, 0);
      rotate(pose, 'leftUpperArm', wave * 0.035, 0, 0.04);
      rotate(pose, 'rightUpperArm', -wave * 0.035, 0, -0.04);
      pose.pelvisY = Math.sin(cycle * 2) * 0.012;
      break;
    case 'dribble':
      locomotion(pose, wave, opposite, 0.38, 0.025);
      rotate(pose, 'rightLowerLeg', Math.max(0, -wave) * 0.46, 0, 0);
      rotate(pose, 'rightFoot', -0.16 + wave * 0.18, wave * 0.1, 0);
      rotate(pose, 'torso', 0.08, -wave * 0.08, wave * 0.025);
      pose.pelvisY = Math.abs(wave) * 0.035;
      break;
    case 'sprint':
    case 'chase':
      locomotion(pose, wave, opposite, state === 'sprint' ? 0.92 : 0.8, 0.08);
      rotate(pose, 'torso', 0.24, -wave * 0.06, 0);
      rotate(pose, 'head', -0.14, wave * 0.025, 0);
      pose.pelvisY = Math.abs(Math.sin(cycle * 2)) * 0.065;
      break;
    case 'strafeLeft':
    case 'strafeRight': {
      const side = state === 'strafeLeft' ? 1 : -1;
      locomotion(pose, wave, opposite, 0.32, 0.035);
      rotate(pose, 'pelvis', 0, side * 0.12, side * 0.08);
      rotate(pose, 'torso', 0.06, -side * 0.08, side * 0.18);
      rotate(pose, 'head', -0.04, side * 0.12, -side * 0.08);
      pose.pelvisX = side * Math.abs(wave) * 0.035;
      break;
    }
    case 'shoot':
      footballKick(pose, progress, 1.18, 0.36);
      rotate(pose, 'torso', -action * 0.08, action * 0.28, -action * 0.16);
      break;
    case 'groundPass':
      footballKick(pose, progress, 0.72, 0.22);
      rotate(pose, 'torso', -action * 0.05, action * 0.16, -action * 0.08);
      break;
    case 'lobPass':
      footballKick(pose, progress, 0.92, 0.58);
      rotate(pose, 'torso', action * 0.13, action * 0.2, -action * 0.12);
      rotate(pose, 'head', -action * 0.12, 0, 0);
      break;
    case 'header':
      rotate(pose, 'torso', -action * 0.44, 0, 0);
      rotate(pose, 'head', action * 0.68, 0, 0);
      rotate(pose, 'leftUpperArm', -action * 0.32, 0, action * 0.38);
      rotate(pose, 'rightUpperArm', -action * 0.32, 0, -action * 0.38);
      pose.pelvisY = action * 0.24;
      break;
    case 'slideTackle':
      rotate(pose, 'pelvis', -action * 0.82, 0, -action * 0.2);
      rotate(pose, 'torso', action * 0.48, 0, action * 0.2);
      rotate(pose, 'leftUpperLeg', -action * 1.16, 0, 0);
      rotate(pose, 'rightUpperLeg', action * 0.28, 0, 0);
      rotate(pose, 'rightLowerLeg', action * 1.0, 0, 0);
      pose.pelvisY = -action * 0.48;
      pose.pelvisZ = action * 0.2;
      break;
    case 'bicycleKick':
      rotate(pose, 'pelvis', -action * 1.36, 0, progress * Math.PI * 0.2);
      rotate(pose, 'torso', -action * 0.34, 0, 0);
      rotate(pose, 'leftUpperLeg', action * 1.05, 0, 0);
      rotate(pose, 'leftLowerLeg', -action * 1.18, 0, 0);
      rotate(pose, 'rightUpperLeg', -action * 1.28, 0, 0);
      rotate(pose, 'rightLowerLeg', action * 0.3, 0, 0);
      pose.pelvisY = action * 0.55;
      break;
    case 'attack':
      rotate(pose, 'torso', 0, -action * 0.4, action * 0.12);
      rotate(pose, 'rightUpperArm', -action * 1.65, 0, -action * 0.3);
      rotate(pose, 'rightLowerArm', -action * 0.62, 0, 0);
      rotate(pose, 'leftUpperArm', action * 0.42, 0, action * 0.16);
      break;
    case 'damage':
    case 'hit': {
      const recoil = Math.sin(Math.PI * clamp01(progress * 1.35));
      rotate(pose, 'torso', -recoil * 0.32, 0, recoil * 0.18);
      rotate(pose, 'head', recoil * 0.38, 0, -recoil * 0.18);
      rotate(pose, 'leftUpperArm', recoil * 0.48, 0, recoil * 0.3);
      rotate(pose, 'rightUpperArm', recoil * 0.48, 0, -recoil * 0.3);
      pose.pelvisZ = -recoil * 0.12;
      break;
    }
    case 'knockdown':
      rotate(pose, 'pelvis', -easeOutCubic(progress) * 1.48, 0, action * 0.22);
      rotate(pose, 'torso', -action * 0.28, 0, -action * 0.16);
      rotate(pose, 'leftUpperArm', action * 0.62, 0, action * 0.48);
      rotate(pose, 'rightUpperArm', action * 0.62, 0, -action * 0.48);
      pose.pelvisY = -action * 0.5;
      pose.pelvisZ = easeOutCubic(progress) * 0.34;
      break;
    case 'celebration':
      rotate(pose, 'torso', 0, wave * 0.28, wave * 0.1);
      rotate(pose, 'leftUpperArm', -action * 2.45, 0, action * 0.35);
      rotate(pose, 'rightUpperArm', -action * 2.45, 0, -action * 0.35);
      rotate(pose, 'leftLowerArm', -action * 0.55, 0, 0);
      rotate(pose, 'rightLowerArm', -action * 0.55, 0, 0);
      pose.pelvisY = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.18;
      break;
    case 'victory': {
      const settle = easeOutCubic(progress);
      rotate(pose, 'torso', -settle * 0.12, 0, 0);
      rotate(pose, 'head', settle * 0.12, 0, 0);
      rotate(pose, 'leftUpperArm', -settle * 2.7, 0, settle * 0.42);
      rotate(pose, 'rightUpperArm', -settle * 2.7, 0, -settle * 0.42);
      rotate(pose, 'leftLowerArm', -settle * 0.48, 0, 0);
      rotate(pose, 'rightLowerArm', -settle * 0.48, 0, 0);
      pose.pelvisY = Math.sin(Math.PI * progress) * 0.2;
      break;
    }
    case 'defeat': {
      const fall = easeInOutCubic(progress);
      rotate(pose, 'pelvis', fall * 0.18, 0, fall * 0.12);
      rotate(pose, 'torso', fall * 0.62, 0, fall * 0.18);
      rotate(pose, 'head', fall * 0.4, 0, -fall * 0.18);
      rotate(pose, 'leftUpperArm', fall * 0.38, 0, fall * 0.14);
      rotate(pose, 'rightUpperArm', fall * 0.38, 0, -fall * 0.14);
      rotate(pose, 'leftUpperLeg', -fall * 0.22, 0, 0);
      rotate(pose, 'rightUpperLeg', fall * 0.32, 0, 0);
      pose.pelvisY = -fall * 0.22;
      break;
    }
  }
  return pose;
}

function locomotion(pose: Pose, wave: number, opposite: number, stride: number, knee: number): void {
  rotate(pose, 'leftUpperLeg', wave * stride, 0, 0);
  rotate(pose, 'rightUpperLeg', opposite * stride, 0, 0);
  rotate(pose, 'leftLowerLeg', Math.max(0, -wave) * stride * 0.72 + knee, 0, 0);
  rotate(pose, 'rightLowerLeg', Math.max(0, wave) * stride * 0.72 + knee, 0, 0);
  rotate(pose, 'leftUpperArm', opposite * stride * 0.72, 0, 0.06);
  rotate(pose, 'rightUpperArm', wave * stride * 0.72, 0, -0.06);
  rotate(pose, 'leftLowerArm', -Math.abs(opposite) * stride * 0.25, 0, 0);
  rotate(pose, 'rightLowerArm', -Math.abs(wave) * stride * 0.25, 0, 0);
}

function footballKick(pose: Pose, progress: number, strength: number, lift: number): void {
  const windup = easeInOutCubic(clamp01(progress / 0.35));
  const strike = easeOutCubic(clamp01((progress - 0.35) / 0.3));
  const recovery = 1 - easeInOutCubic(clamp01((progress - 0.68) / 0.32));
  const leg = (-windup * 0.74 + strike * strength) * recovery;
  rotate(pose, 'rightUpperLeg', leg, 0, -lift * 0.12);
  rotate(pose, 'rightLowerLeg', (windup * 0.9 - strike * 0.72) * recovery, 0, 0);
  rotate(pose, 'rightFoot', (-strike * (0.42 + lift) + windup * 0.2) * recovery, 0, 0);
  rotate(pose, 'leftUpperLeg', -strike * 0.16 * recovery, 0, 0);
  rotate(pose, 'leftUpperArm', -strike * 0.3 * recovery, 0, 0.22 * recovery);
  rotate(pose, 'rightUpperArm', strike * 0.36 * recovery, 0, -0.3 * recovery);
  pose.pelvisY = Math.sin(Math.PI * progress) * lift * 0.08;
}

function emptyPose(): Pose {
  return { rotations: {}, pelvisX: 0, pelvisY: 0, pelvisZ: 0, leftFootY: 0, rightFootY: 0 };
}

function rotate(pose: Pose, joint: JointName, x: number, y: number, z: number): void {
  const current = pose.rotations[joint];
  if (current) {
    current.x += x;
    current.y += y;
    current.z += z;
  } else {
    pose.rotations[joint] = { x, y, z };
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - clamp01(value), 3);
}

function isLocomotionState(
  state: VoxelAnimationState,
): state is Extract<
  VoxelAnimationState,
  'idle' | 'dribble' | 'sprint' | 'strafeLeft' | 'strafeRight' | 'chase'
> {
  return (
    state === 'idle' ||
    state === 'dribble' ||
    state === 'sprint' ||
    state === 'strafeLeft' ||
    state === 'strafeRight' ||
    state === 'chase'
  );
}

function shouldLayerLocomotion(state: VoxelAnimationState): boolean {
  return (
    state === 'attack' ||
    state === 'damage' ||
    state === 'hit' ||
    state === 'groundPass' ||
    state === 'lobPass' ||
    state === 'celebration'
  );
}

function layerUpperBody(base: Pose, action: Pose, state: VoxelAnimationState): Pose {
  const result = clonePose(base);
  const upperJoints: JointName[] = [
    'torso',
    'head',
    'leftUpperArm',
    'leftLowerArm',
    'leftHand',
    'rightUpperArm',
    'rightLowerArm',
    'rightHand',
  ];
  for (const joint of upperJoints) {
    const actionRotation = action.rotations[joint];
    if (actionRotation) result.rotations[joint] = { ...actionRotation };
  }
  if (state === 'groundPass' || state === 'lobPass') {
    for (const joint of ['rightUpperLeg', 'rightLowerLeg', 'rightFoot'] as const) {
      const actionRotation = action.rotations[joint];
      if (actionRotation) result.rotations[joint] = { ...actionRotation };
    }
    result.pelvisY = base.pelvisY * 0.45 + action.pelvisY;
  } else {
    result.pelvisX += action.pelvisX;
    result.pelvisY += action.pelvisY;
    result.pelvisZ += action.pelvisZ;
  }
  return result;
}

function applyPersonality(
  pose: Pose,
  personality: VoxelPersonalityProfile,
  state: VoxelAnimationState,
): void {
  if (isLocomotionState(state)) {
    for (const joint of ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'] as const) {
      scaleRotation(pose, joint, personality.strideScale);
    }
    for (const joint of ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm'] as const) {
      scaleRotation(pose, joint, personality.armSwing);
    }
    pose.pelvisY *= personality.bounceScale;
    rotate(pose, 'torso', personality.torsoLean * 0.045, 0, personality.lateralSwagger * 0.018);
  } else if (state !== 'damage' && state !== 'hit' && state !== 'knockdown') {
    scaleRotation(pose, 'torso', 0.82 + personality.movementWeight * 0.18);
  }
}

function applyAimLayer(pose: Pose, aimYaw: number, state: VoxelAnimationState): void {
  if (Math.abs(aimYaw) < 0.001 || state === 'knockdown' || state === 'defeat') return;
  rotate(pose, 'torso', 0, aimYaw * 0.62, 0);
  rotate(pose, 'head', 0, aimYaw * 0.38, 0);
}

function applyFootPlanting(
  pose: Pose,
  state: VoxelAnimationState,
  leftHeight: number,
  rightHeight: number,
  groundPitch: number,
  groundRoll: number,
): void {
  const plant =
    state === 'idle' || state === 'groundPass' || state === 'lobPass' || state === 'shoot' ? 1 : 0.32;
  const leftLeg = (pose.rotations.leftUpperLeg?.x ?? 0) + (pose.rotations.leftLowerLeg?.x ?? 0);
  const rightLeg = (pose.rotations.rightUpperLeg?.x ?? 0) + (pose.rotations.rightLowerLeg?.x ?? 0);
  rotate(pose, 'leftFoot', (-leftLeg + groundPitch) * plant, 0, groundRoll * plant);
  rotate(pose, 'rightFoot', (-rightLeg + groundPitch) * plant, 0, groundRoll * plant);
  pose.leftFootY = leftHeight;
  pose.rightFootY = rightHeight;
  pose.pelvisY += Math.min(leftHeight, rightHeight) * 0.75;
  rotate(pose, 'pelvis', groundPitch * 0.22, 0, groundRoll * 0.28);
}

function expressionForState(state: VoxelAnimationState) {
  if (state === 'damage' || state === 'hit' || state === 'knockdown') return 'hurt' as const;
  if (state === 'defeat') return 'defeated' as const;
  if (state === 'celebration' || state === 'victory') return 'celebrate' as const;
  if (
    state === 'shoot' ||
    state === 'groundPass' ||
    state === 'lobPass' ||
    state === 'header' ||
    state === 'slideTackle' ||
    state === 'bicycleKick' ||
    state === 'attack'
  ) {
    return 'attack' as const;
  }
  if (state === 'sprint' || state === 'chase' || state === 'strafeLeft' || state === 'strafeRight') {
    return 'focused' as const;
  }
  return 'neutral' as const;
}

function scaleRotation(pose: Pose, joint: JointName, amount: number): void {
  const rotation = pose.rotations[joint];
  if (!rotation) return;
  rotation.x *= amount;
  rotation.y *= amount;
  rotation.z *= amount;
}

function clonePose(source: Pose): Pose {
  const result = emptyPose();
  result.pelvisX = source.pelvisX;
  result.pelvisY = source.pelvisY;
  result.pelvisZ = source.pelvisZ;
  result.leftFootY = source.leftFootY;
  result.rightFootY = source.rightFootY;
  for (const [joint, rotation] of Object.entries(source.rotations) as [JointName, JointRotation][]) {
    result.rotations[joint] = { ...rotation };
  }
  return result;
}

function interpolatePose(from: Pose, to: Pose, amount: number): Pose {
  const result = emptyPose();
  const joints = new Set<JointName>([
    ...(Object.keys(from.rotations) as JointName[]),
    ...(Object.keys(to.rotations) as JointName[]),
  ]);
  for (const joint of joints) {
    const a = from.rotations[joint] ?? { x: 0, y: 0, z: 0 };
    const b = to.rotations[joint] ?? { x: 0, y: 0, z: 0 };
    result.rotations[joint] = {
      x: a.x + (b.x - a.x) * amount,
      y: a.y + (b.y - a.y) * amount,
      z: a.z + (b.z - a.z) * amount,
    };
  }
  result.pelvisX = from.pelvisX + (to.pelvisX - from.pelvisX) * amount;
  result.pelvisY = from.pelvisY + (to.pelvisY - from.pelvisY) * amount;
  result.pelvisZ = from.pelvisZ + (to.pelvisZ - from.pelvisZ) * amount;
  result.leftFootY = from.leftFootY + (to.leftFootY - from.leftFootY) * amount;
  result.rightFootY = from.rightFootY + (to.rightFootY - from.rightFootY) * amount;
  return result;
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}
