import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createWebAuthoredFootballClips, WEB_AUTHORED_FOOTBALL_MOTIONS } from './WebAuthoredFootballClips';
import { resolveFootballAnimationContract } from './FootballAnimationContract';

function canonicalRig(): THREE.Group {
  const root = new THREE.Group();
  for (const name of [
    'root',
    'pelvis',
    'spine_01',
    'spine_02',
    'spine_03',
    'neck_01',
    'Head',
    'clavicle_l',
    'upperarm_l',
    'lowerarm_l',
    'hand_l',
    'clavicle_r',
    'upperarm_r',
    'lowerarm_r',
    'hand_r',
    'thigh_l',
    'calf_l',
    'foot_l',
    'thigh_r',
    'calf_r',
    'foot_r',
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    root.add(bone);
  }
  return root;
}

describe('web-authored football clips', () => {
  it('provides one in-place dedicated clip for every semantic state', () => {
    const clips = createWebAuthoredFootballClips(canonicalRig());
    expect(clips).toHaveLength(15);
    expect(new Set(clips.map((clip) => clip.name)).size).toBe(15);
    expect(clips.every((clip) => clip.duration > 0 && clip.tracks.length > 0)).toBe(true);
    expect(clips.every((clip) => clip.tracks.every((track) => track.name.endsWith('.quaternion')))).toBe(
      true,
    );
    const resolved = resolveFootballAnimationContract(clips.map((clip) => clip.name));
    expect([...resolved.values()].every((entry) => entry.source === 'dedicated')).toBe(true);
  });

  it('keeps its public motion manifest aligned with the generated clips', () => {
    expect(WEB_AUTHORED_FOOTBALL_MOTIONS.map((motion) => motion.name)).toEqual(
      createWebAuthoredFootballClips(canonicalRig()).map((clip) => clip.name),
    );
  });
});
