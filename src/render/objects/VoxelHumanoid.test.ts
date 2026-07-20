import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createVoxelHumanoid } from './VoxelHumanoid';

describe('voxel humanoid', () => {
  it('creates a stable, grounded joint hierarchy and equipment sockets', () => {
    const athlete = createVoxelHumanoid({ namePrefix: 'captain' });

    expect(athlete.root.name).toBe('captain-root');
    expect(athlete.root.userData.visualStyle).toBe('original-block-football');
    expect(athlete.root.userData.rigType).toBe('voxel-humanoid-v1');
    expect(athlete.pelvis.parent).toBe(athlete.root);
    expect(athlete.joints.pelvis).toBe(athlete.pelvis);
    expect(athlete.joints.leftUpperArm).toBe(athlete.leftUpperArm);
    expect(athlete.torso.parent).toBe(athlete.pelvis);
    expect(athlete.head.parent).toBe(athlete.torso);
    expect(athlete.leftLowerArm.parent).toBe(athlete.leftUpperArm);
    expect(athlete.leftHand.parent).toBe(athlete.leftLowerArm);
    expect(athlete.rightLowerLeg.parent).toBe(athlete.rightUpperLeg);
    expect(athlete.rightFoot.parent).toBe(athlete.rightLowerLeg);
    expect(athlete.sockets.leftHand.parent).toBe(athlete.leftHand);
    expect(athlete.sockets.rightFoot.parent).toBe(athlete.rightFoot);
    expect(athlete.sockets.back.name).toBe('captain-socket-back');

    const bounds = new THREE.Box3().setFromObject(athlete.root);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(bounds.max.y).toBeGreaterThan(2.35);
    expect(bounds.max.z).toBeGreaterThan(0);
    athlete.dispose();
  });

  it('recolors one shared-resource instance in place without affecting another', () => {
    const first = createVoxelHumanoid();
    const second = createVoxelHumanoid();
    const firstRoot = first.root;
    const firstTorso = first.root.getObjectByName('voxel-athlete-torso-mesh') as THREE.Mesh;
    const secondTorso = second.root.getObjectByName('voxel-athlete-torso-mesh') as THREE.Mesh;

    first.setPalette({ primary: '#25a862', accent: '#ff6633', boots: '#ffffff' });

    expect(first.root).toBe(firstRoot);
    expect((firstTorso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x25a862);
    expect((secondTorso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x8d1438);
    expect(firstTorso.material).not.toBe(secondTorso.material);
    const wristband = first.root.getObjectByName('voxel-athlete-left-wristband-mesh') as THREE.Mesh;
    expect((wristband.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xff6633);
    first.dispose();
    second.dispose();
  });

  it('supports custom athlete proportions, palette, face, accessories and shadows', () => {
    const athlete = createVoxelHumanoid({
      colors: { kitPrimary: '#1269d3', accent: '#ff8b18' },
      proportions: { torsoWidth: 0.8, upperLegLength: 0.58 },
      facialStyle: 'masked',
      accessories: { hair: 'crest', shoulderPads: true, wristbands: false, shinGuards: false },
      castShadow: false,
    });

    expect(athlete.root.userData.facialStyle).toBe('masked');
    expect(athlete.root.userData.hairStyle).toBe('crest');
    expect(athlete.root.getObjectByName('voxel-athlete-face-mask-mesh')).toBeInstanceOf(THREE.Mesh);
    expect(athlete.root.getObjectByName('voxel-athlete-left-shoulder-pad-mesh')).toBeInstanceOf(THREE.Mesh);
    expect(athlete.root.getObjectByName('voxel-athlete-left-wristband-mesh')).toBeUndefined();
    const torso = athlete.root.getObjectByName('voxel-athlete-torso-mesh') as THREE.Mesh;
    expect((torso.geometry as THREE.BoxGeometry).parameters.width).toBe(0.8);
    expect((torso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x1269d3);
    athlete.root.traverse((object) => {
      if (object instanceof THREE.Mesh) expect(object.castShadow).toBe(false);
    });
    athlete.dispose();
  });

  it('shares cached GPU resources and releases them only after the final owner', () => {
    const first = createVoxelHumanoid({ accessories: { hair: 'none' } });
    const second = createVoxelHumanoid({ accessories: { hair: 'none' } });
    const firstTorso = first.root.getObjectByName('voxel-athlete-torso-mesh') as THREE.Mesh;
    const secondTorso = second.root.getObjectByName('voxel-athlete-torso-mesh') as THREE.Mesh;

    expect(firstTorso.geometry).toBe(secondTorso.geometry);
    expect(firstTorso.material).toBe(secondTorso.material);
    const geometryDispose = vi.spyOn(firstTorso.geometry, 'dispose');
    const materialDispose = vi.spyOn(firstTorso.material as THREE.Material, 'dispose');

    first.dispose();
    first.dispose();
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(first.root.userData.disposed).toBe(true);

    second.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });
});
