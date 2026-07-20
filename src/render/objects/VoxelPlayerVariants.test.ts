import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CHARACTER_IDS } from '../../game/characters';
import { createVoxelHumanoid } from './VoxelHumanoid';
import { createVoxelPlayerVariantController } from './VoxelPlayerVariants';

describe('voxel player variants', () => {
  it('switches six original silhouettes on one shared articulated rig', () => {
    const rig = createVoxelHumanoid({ namePrefix: 'player' });
    const variants = createVoxelPlayerVariantController(rig);

    for (const id of CHARACTER_IDS) {
      variants.apply(id);
      expect(rig.root.userData.characterVariant).toBe(id);
      expect(rig.root.userData.sharedSkeleton).toBe(true);
      expect(rig.root.getObjectByName(`player-accessory-${id}`)?.visible).toBe(true);
      for (const candidate of CHARACTER_IDS.filter((entry) => entry !== id)) {
        expect(rig.root.getObjectByName(`player-accessory-${candidate}`)?.visible).toBe(false);
      }
    }

    expect(rig.root.getObjectByName('player-variant-tower-shoulder-left')).toBeInstanceOf(THREE.Mesh);
    expect(rig.root.getObjectByName('player-variant-engine-shard-canister')).toBeInstanceOf(THREE.Mesh);
    expect(rig.root.getObjectByName('player-variant-guardian-keeper-helm')).toBeInstanceOf(THREE.Mesh);
    expect(rig.root.getObjectByName('player-variant-maestro-swept-crown')?.parent?.parent).toBe(rig.head);
    expect(rig.root.getObjectByName('player-variant-maestro-scarf')?.parent?.parent).toBe(rig.torso);
    expect(rig.root.getObjectByName('player-variant-guardian-keeper-helm')?.parent?.parent).toBe(rig.head);
    variants.dispose();
    rig.dispose();
  });

  it('recolors and scales each identity without rebuilding the rig', () => {
    const rig = createVoxelHumanoid({ namePrefix: 'player' });
    const variants = createVoxelPlayerVariantController(rig);
    const root = rig.root;
    const torso = root.getObjectByName('player-torso-mesh') as THREE.Mesh;

    variants.apply('breakaway');
    expect(rig.root).toBe(root);
    expect((torso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xd9e4ef);
    expect(root.scale.y).toBeGreaterThan(root.scale.x);

    variants.apply('tower');
    expect((torso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x25222f);
    expect(root.scale.x).toBeGreaterThan(1);
    variants.dispose();
    rig.dispose();
  });

  it('disposes owned variant resources once', () => {
    const rig = createVoxelHumanoid({ namePrefix: 'player' });
    const variants = createVoxelPlayerVariantController(rig);
    const shoulder = rig.root.getObjectByName('player-variant-tower-shoulder-left') as THREE.Mesh;
    const geometryDispose = vi.spyOn(shoulder.geometry, 'dispose');
    const materialDispose = vi.spyOn(shoulder.material as THREE.Material, 'dispose');

    variants.dispose();
    variants.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    rig.dispose();
  });
});
