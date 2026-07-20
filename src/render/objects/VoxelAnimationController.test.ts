import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { VoxelHumanoid } from './VoxelHumanoid';
import { VoxelAnimationController } from './VoxelAnimationController';

function makeRig(): VoxelHumanoid {
  const group = (): THREE.Group => new THREE.Group();
  return {
    joints: {
      pelvis: group(),
      torso: group(),
      head: group(),
      leftUpperArm: group(),
      leftLowerArm: group(),
      rightUpperArm: group(),
      rightLowerArm: group(),
      leftUpperLeg: group(),
      leftLowerLeg: group(),
      rightUpperLeg: group(),
      rightLowerLeg: group(),
      leftFoot: group(),
      rightFoot: group(),
    },
  } as VoxelHumanoid;
}

describe('VoxelAnimationController', () => {
  it('animates articulated joints deterministically without moving the rig root', () => {
    const rig = makeRig();
    const rootPosition = new THREE.Vector3(8, 0, -3);
    const rigRoot = new THREE.Group();
    rigRoot.position.copy(rootPosition);
    rigRoot.add(rig.joints.pelvis);
    const controller = new VoxelAnimationController(rig);

    expect(controller.play('sprint')).toBe(true);
    controller.update(0.135);

    expect(rig.joints.leftUpperLeg.rotation.x).toBeCloseTo(0.92, 5);
    expect(rig.joints.rightUpperLeg.rotation.x).toBeCloseTo(-0.92, 5);
    expect(rig.joints.leftUpperArm.rotation.x).toBeCloseTo(-0.92 * 0.72, 5);
    expect(rigRoot.position).toEqual(rootPosition);
  });

  it('locks one-shots against lower-priority locomotion and permits stronger reactions', () => {
    const rig = makeRig();
    const controller = new VoxelAnimationController(rig);

    expect(controller.play('shoot')).toBe(true);
    expect(controller.isLocked).toBe(true);
    expect(controller.play('sprint')).toBe(false);
    expect(controller.play('damage')).toBe(true);
    expect(controller.state).toBe('damage');
  });

  it('recovers from a completed one-shot into unlocked idle motion', () => {
    const rig = makeRig();
    const controller = new VoxelAnimationController(rig);

    controller.play('groundPass');
    controller.update(0.57);

    expect(controller.state).toBe('idle');
    expect(controller.isLocked).toBe(false);
    expect(controller.play('dribble')).toBe(true);
    controller.update(0.18);
    expect(Math.abs(rig.joints.rightFoot.rotation.x)).toBeGreaterThan(0.01);
  });

  it.each(['victory', 'defeat'] as const)('holds the %s terminal pose until reset', (state) => {
    const rig = makeRig();
    const controller = new VoxelAnimationController(rig);

    expect(controller.play(state)).toBe(true);
    controller.update(4);
    const heldTorsoRotation = rig.joints.torso.rotation.x;

    expect(controller.isTerminal).toBe(true);
    expect(controller.play('damage')).toBe(false);
    controller.update(4);
    expect(rig.joints.torso.rotation.x).toBeCloseTo(heldTorsoRotation, 8);

    controller.reset();
    expect(controller.state).toBeUndefined();
    expect(controller.isTerminal).toBe(false);
    expect(rig.joints.torso.rotation.x).toBe(0);
    expect(controller.play('idle')).toBe(true);
  });

  it('restores the captured bind pose and becomes inert when disposed', () => {
    const rig = makeRig();
    rig.joints.pelvis.position.y = 1.25;
    rig.joints.head.rotation.y = 0.2;
    const controller = new VoxelAnimationController(rig);

    controller.play('header');
    controller.update(0.3);
    controller.dispose();

    expect(rig.joints.pelvis.position.y).toBeCloseTo(1.25);
    expect(rig.joints.head.rotation.y).toBeCloseTo(0.2);
    expect(controller.play('idle')).toBe(false);
    controller.update(1);
    expect(rig.joints.head.rotation.y).toBeCloseTo(0.2);
  });
});
