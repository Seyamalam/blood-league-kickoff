import * as THREE from 'three';

type Rotation = readonly [x: number, y: number, z: number];
type Pose = Readonly<Record<string, Rotation>>;

interface MotionDefinition {
  readonly name: string;
  readonly duration: number;
  readonly frames: readonly (readonly [normalizedTime: number, pose: Pose])[];
}

const r = (x = 0, y = 0, z = 0): Rotation => [x, y, z];
const frame = (time: number, pose: Pose): readonly [number, Pose] => [time, pose];
const NATURAL_STANCE: Pose = Object.freeze({
  upperarm_l: r(0.04, 0, -1.12),
  upperarm_r: r(0.04, 0, 1.12),
  lowerarm_l: r(-0.08),
  lowerarm_r: r(-0.08),
});

/** Browser-authored in-place motions that use the canonical 65-joint shared skeleton. */
export const WEB_AUTHORED_FOOTBALL_MOTIONS: readonly MotionDefinition[] = Object.freeze([
  {
    name: 'Football_Idle_Loop',
    duration: 2.4,
    frames: [
      frame(0, { spine_03: r(0.02), upperarm_l: r(0, 0, -1.12), upperarm_r: r(0, 0, 1.12) }),
      frame(0.5, {
        spine_03: r(-0.025),
        neck_01: r(0, 0.04),
        upperarm_l: r(0, 0, -1.08),
        upperarm_r: r(0, 0, 1.08),
      }),
      frame(1, { spine_03: r(0.02), upperarm_l: r(0, 0, -1.12), upperarm_r: r(0, 0, 1.12) }),
    ],
  },
  {
    name: 'Football_Dribble_Loop',
    duration: 0.76,
    frames: [
      frame(0, {
        thigh_l: r(-0.28),
        thigh_r: r(0.3),
        calf_l: r(0.22),
        calf_r: r(-0.15),
        upperarm_l: r(0.3, 0, -1.05),
        upperarm_r: r(-0.3, 0, 1.05),
      }),
      frame(0.5, {
        thigh_l: r(0.3),
        thigh_r: r(-0.28),
        calf_l: r(-0.15),
        calf_r: r(0.22),
        upperarm_l: r(-0.3, 0, -1.05),
        upperarm_r: r(0.3, 0, 1.05),
      }),
      frame(1, {
        thigh_l: r(-0.28),
        thigh_r: r(0.3),
        calf_l: r(0.22),
        calf_r: r(-0.15),
        upperarm_l: r(0.3, 0, -1.05),
        upperarm_r: r(-0.3, 0, 1.05),
      }),
    ],
  },
  {
    name: 'Football_Strafe_Left_Loop',
    duration: 0.82,
    frames: [
      frame(0, {
        pelvis: r(0, 0.16, -0.08),
        thigh_l: r(-0.1, 0, -0.24),
        thigh_r: r(0.16, 0, 0.2),
        spine_02: r(0, -0.12, 0.08),
      }),
      frame(0.5, {
        pelvis: r(0, 0.16, 0.05),
        thigh_l: r(0.18, 0, -0.15),
        thigh_r: r(-0.12, 0, 0.12),
        spine_02: r(0, -0.12, -0.05),
      }),
      frame(1, {
        pelvis: r(0, 0.16, -0.08),
        thigh_l: r(-0.1, 0, -0.24),
        thigh_r: r(0.16, 0, 0.2),
        spine_02: r(0, -0.12, 0.08),
      }),
    ],
  },
  {
    name: 'Football_Strafe_Right_Loop',
    duration: 0.82,
    frames: [
      frame(0, {
        pelvis: r(0, -0.16, 0.08),
        thigh_l: r(0.16, 0, -0.2),
        thigh_r: r(-0.1, 0, 0.24),
        spine_02: r(0, 0.12, -0.08),
      }),
      frame(0.5, {
        pelvis: r(0, -0.16, -0.05),
        thigh_l: r(-0.12, 0, -0.12),
        thigh_r: r(0.18, 0, 0.15),
        spine_02: r(0, 0.12, 0.05),
      }),
      frame(1, {
        pelvis: r(0, -0.16, 0.08),
        thigh_l: r(0.16, 0, -0.2),
        thigh_r: r(-0.1, 0, 0.24),
        spine_02: r(0, 0.12, -0.08),
      }),
    ],
  },
  {
    name: 'Football_Ground_Pass',
    duration: 0.72,
    frames: [
      frame(0, { spine_02: r(0, -0.12), thigh_r: r(-0.38), calf_r: r(0.24), upperarm_l: r(0.18, 0, -0.35) }),
      frame(0.38, {
        spine_02: r(0.08, 0.2),
        thigh_r: r(0.72),
        calf_r: r(-0.34),
        foot_r: r(0.26),
        upperarm_l: r(-0.22, 0, -0.5),
      }),
      frame(0.58, { spine_02: r(-0.06, 0.28), thigh_r: r(-0.12), calf_r: r(0.12), foot_r: r(-0.18) }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Lob_Pass',
    duration: 0.9,
    frames: [
      frame(0, { spine_02: r(-0.08, 0.12), thigh_l: r(-0.44), calf_l: r(0.38), upperarm_r: r(0.1, 0, 0.42) }),
      frame(0.48, {
        spine_02: r(0.18, -0.18),
        thigh_l: r(0.96),
        calf_l: r(-0.48),
        foot_l: r(0.42),
        upperarm_r: r(-0.38, 0, 0.56),
      }),
      frame(0.68, { spine_02: r(0.08, -0.28), thigh_l: r(0.18), calf_l: r(-0.12) }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Shoot',
    duration: 0.92,
    frames: [
      frame(0, {
        spine_02: r(-0.18, -0.22),
        thigh_r: r(-0.72),
        calf_r: r(0.62),
        upperarm_l: r(0.4, 0, -0.62),
        upperarm_r: r(-0.2, 0, 0.5),
      }),
      frame(0.44, {
        spine_02: r(0.24, 0.34),
        pelvis: r(0, 0.24),
        thigh_r: r(1.25),
        calf_r: r(-0.58),
        foot_r: r(0.38),
        upperarm_l: r(-0.45, 0, -0.72),
        upperarm_r: r(0.38, 0, 0.68),
      }),
      frame(0.7, { spine_02: r(0.12, 0.48), thigh_r: r(0.35), calf_r: r(-0.2) }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Header',
    duration: 0.78,
    frames: [
      frame(0, {
        spine_01: r(-0.22),
        spine_03: r(-0.18),
        neck_01: r(0.16),
        upperarm_l: r(0, 0, -0.58),
        upperarm_r: r(0, 0, 0.58),
      }),
      frame(0.42, {
        spine_01: r(0.34),
        spine_03: r(0.42),
        neck_01: r(-0.36),
        Head: r(-0.28),
        upperarm_l: r(-0.2, 0, -0.75),
        upperarm_r: r(-0.2, 0, 0.75),
      }),
      frame(0.66, { spine_03: r(0.14), neck_01: r(-0.12), Head: r(-0.08) }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Slide_Tackle',
    duration: 0.96,
    frames: [
      frame(0, { pelvis: r(0, 0, -0.12), spine_02: r(0.18, 0, 0.12), thigh_l: r(-0.45), thigh_r: r(0.3) }),
      frame(0.38, {
        pelvis: r(-0.38, 0, -0.86),
        spine_01: r(0.42, 0, 0.42),
        thigh_l: r(1.22),
        calf_l: r(-0.38),
        thigh_r: r(-0.55),
        calf_r: r(0.52),
        upperarm_l: r(-0.32, 0, -1.05),
        upperarm_r: r(0.2, 0, 0.72),
      }),
      frame(0.7, { pelvis: r(-0.2, 0, -0.62), thigh_l: r(0.65), thigh_r: r(-0.24) }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Bicycle_Kick',
    duration: 1.18,
    frames: [
      frame(0, {
        pelvis: r(-0.28),
        spine_02: r(-0.36),
        thigh_l: r(0.35),
        thigh_r: r(-0.45),
        upperarm_l: r(0, 0, -0.65),
        upperarm_r: r(0, 0, 0.65),
      }),
      frame(0.34, {
        pelvis: r(-1.18, 0, 0.16),
        spine_01: r(-0.62),
        thigh_l: r(-0.92),
        calf_l: r(0.72),
        thigh_r: r(1.15),
        calf_r: r(-0.58),
        upperarm_l: r(-0.3, 0, -1.1),
        upperarm_r: r(-0.3, 0, 1.1),
      }),
      frame(0.55, {
        pelvis: r(-2.15, 0, -0.12),
        spine_01: r(-0.42),
        thigh_l: r(1.18),
        calf_l: r(-0.6),
        thigh_r: r(-0.95),
        calf_r: r(0.78),
      }),
      frame(0.78, {
        pelvis: r(-2.72),
        thigh_l: r(0.18),
        thigh_r: r(0.24),
        upperarm_l: r(0, 0, -0.8),
        upperarm_r: r(0, 0, 0.8),
      }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Damage',
    duration: 0.48,
    frames: [
      frame(0, {}),
      frame(0.3, {
        spine_01: r(-0.3, 0, 0.22),
        spine_03: r(-0.24, -0.18),
        Head: r(0.15, -0.2),
        upperarm_l: r(0.2, 0, -0.34),
      }),
      frame(0.62, { spine_01: r(0.16, 0, -0.12), Head: r(-0.08, 0.12) }),
      frame(1, {}),
    ],
  },
  {
    name: 'Football_Knockdown',
    duration: 1.42,
    frames: [
      frame(0, {}),
      frame(0.38, {
        pelvis: r(-0.75, 0, 0.4),
        spine_01: r(-0.45),
        thigh_l: r(0.48),
        thigh_r: r(-0.32),
        upperarm_l: r(0, 0, -0.9),
        upperarm_r: r(0, 0, 0.75),
      }),
      frame(0.72, { pelvis: r(-1.45, 0, 0.72), spine_01: r(-0.65), thigh_l: r(0.22), thigh_r: r(0.15) }),
      frame(1, { pelvis: r(-1.5, 0, 0.76), spine_01: r(-0.7), Head: r(0.18) }),
    ],
  },
  {
    name: 'Football_Celebration',
    duration: 1.65,
    frames: [
      frame(0, {}),
      frame(0.38, {
        spine_03: r(-0.12),
        upperarm_l: r(-1.45, 0, -0.42),
        lowerarm_l: r(-0.55),
        upperarm_r: r(-1.45, 0, 0.42),
        lowerarm_r: r(-0.55),
        Head: r(0, 0.18),
      }),
      frame(0.68, {
        spine_03: r(0.18),
        upperarm_l: r(-1.05, 0, -0.72),
        upperarm_r: r(-1.05, 0, 0.72),
        Head: r(0, -0.2),
      }),
      frame(1, { upperarm_l: r(-1.35, 0, -0.48), upperarm_r: r(-1.35, 0, 0.48) }),
    ],
  },
  {
    name: 'Football_Victory',
    duration: 2.1,
    frames: [
      frame(0, {}),
      frame(0.34, {
        spine_03: r(-0.18),
        upperarm_l: r(-1.75, 0, -0.2),
        lowerarm_l: r(-0.42),
        upperarm_r: r(-1.75, 0, 0.2),
        lowerarm_r: r(-0.42),
        Head: r(-0.08),
      }),
      frame(0.62, {
        spine_03: r(0.12),
        upperarm_l: r(-1.42, 0, -0.62),
        upperarm_r: r(-1.42, 0, 0.62),
        Head: r(0.06, 0.22),
      }),
      frame(1, { upperarm_l: r(-1.65, 0, -0.3), upperarm_r: r(-1.65, 0, 0.3) }),
    ],
  },
  {
    name: 'Football_Defeat',
    duration: 1.9,
    frames: [
      frame(0, {}),
      frame(0.42, {
        spine_01: r(0.28),
        spine_03: r(0.35),
        neck_01: r(0.28),
        Head: r(0.32),
        upperarm_l: r(0.15, 0, -0.22),
        upperarm_r: r(0.15, 0, 0.22),
      }),
      frame(0.72, {
        pelvis: r(0.1, 0, 0.14),
        spine_01: r(0.48),
        spine_03: r(0.52),
        Head: r(0.44),
        thigh_l: r(0.28),
        thigh_r: r(0.28),
      }),
      frame(1, {
        pelvis: r(0.14, 0, 0.18),
        spine_01: r(0.52),
        spine_03: r(0.56),
        Head: r(0.48),
        thigh_l: r(0.34),
        thigh_r: r(0.34),
      }),
    ],
  },
]);

export function createWebAuthoredFootballClips(root: THREE.Object3D): readonly THREE.AnimationClip[] {
  return WEB_AUTHORED_FOOTBALL_MOTIONS.map((motion) => createClip(root, motion));
}

function createClip(root: THREE.Object3D, motion: MotionDefinition): THREE.AnimationClip {
  const boneNames = new Set([
    ...Object.keys(NATURAL_STANCE),
    ...motion.frames.flatMap(([, pose]) => Object.keys(pose)),
  ]);
  const tracks: THREE.QuaternionKeyframeTrack[] = [];
  for (const boneName of boneNames) {
    const bone = root.getObjectByName(boneName);
    if (!bone) continue;
    const times: number[] = [];
    const values: number[] = [];
    for (const [normalizedTime, pose] of motion.frames) {
      const rotation = pose[boneName] ?? NATURAL_STANCE[boneName] ?? r();
      const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation, 'XYZ'));
      const value = bone.quaternion.clone().multiply(offset).normalize();
      times.push(normalizedTime * motion.duration);
      values.push(value.x, value.y, value.z, value.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values));
  }
  return new THREE.AnimationClip(motion.name, motion.duration, tracks);
}
