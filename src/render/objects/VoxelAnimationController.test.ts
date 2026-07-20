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

    expect(rig.joints.leftUpperLeg.rotation.x).toBeGreaterThan(0.7);
    expect(rig.joints.rightUpperLeg.rotation.x).toBeLessThan(-0.7);
    expect(rig.joints.leftUpperArm.rotation.x).toBeLessThan(-0.4);
    expect(rigRoot.position).toEqual(rootPosition);
  });

  it('layers upper-body attacks over locomotion and preserves aim separation', () => {
    const rig = makeRig();
    const controller = new VoxelAnimationController(rig);

    controller.setLocomotion('sprint');
    controller.update(0.12);
    controller.play('attack');
    controller.setAimYaw(0.55);
    controller.update(0.2);

    expect(Math.abs(rig.joints.leftUpperLeg.rotation.x)).toBeGreaterThan(0.1);
    expect(rig.joints.rightUpperArm.rotation.x).toBeLessThan(-0.4);
    expect(rig.joints.torso.rotation.y).toBeGreaterThan(0.05);
    expect(rig.joints.head.rotation.y).toBeGreaterThan(0.05);
  });

  it('plants both feet against independently sampled slope heights', () => {
    const rig = makeRig();
    const controller = new VoxelAnimationController(rig);

    controller.setGrounding(0.12, 0.24, { x: 0.15, y: 0.98, z: -0.1 });
    controller.play('idle');
    controller.update(0.2);

    expect(rig.joints.leftFoot.position.y).toBeCloseTo(0.12);
    expect(rig.joints.rightFoot.position.y).toBeCloseTo(0.24);
    expect(Math.abs(rig.joints.leftFoot.rotation.x)).toBeGreaterThan(0.05);
    expect(Math.abs(rig.joints.rightFoot.rotation.z)).toBeGreaterThan(0.05);
  });

  it('gives heavy and explosive heroes visibly different stride personalities', () => {
    const towerRig = makeRig();
    const breakawayRig = makeRig();
    const tower = new VoxelAnimationController(towerRig);
    const breakaway = new VoxelAnimationController(breakawayRig);

    tower.setPersonality('tower');
    breakaway.setPersonality('breakaway');
    tower.play('sprint');
    breakaway.play('sprint');
    tower.update(0.135);
    breakaway.update(0.135);

    expect(Math.abs(breakawayRig.joints.leftUpperLeg.rotation.x)).toBeGreaterThan(
      Math.abs(towerRig.joints.leftUpperLeg.rotation.x),
    );
    expect(Math.abs(breakawayRig.joints.leftUpperArm.rotation.x)).toBeGreaterThan(
      Math.abs(towerRig.joints.leftUpperArm.rotation.x),
    );
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

  it('lets a goal celebration replace the scoring technique', () => {
    const controller = new VoxelAnimationController(makeRig());

    expect(controller.play('bicycleKick')).toBe(true);
    expect(controller.play('celebration')).toBe(true);
    expect(controller.state).toBe('celebration');
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
