import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CHARACTER_IDS } from '../../game/characters';
import {
  CHARACTER_VARIANT_VISUALS,
  createImportedCharacterVariantController,
} from './PlayerCharacterVariants';

describe('shared-rig character variants', () => {
  it('defines six animation-safe silhouettes without skeleton overrides', () => {
    expect(Object.keys(CHARACTER_VARIANT_VISUALS)).toEqual([...CHARACTER_IDS]);
    for (const definition of Object.values(CHARACTER_VARIANT_VISUALS)) {
      expect(definition.accessoryNames.length).toBeGreaterThanOrEqual(5);
      expect(definition.bodyScale.every((axis) => axis >= 0.9 && axis <= 1.12)).toBe(true);
      expect(definition.accessoryNames).toContain(definition.headStyle);
      expect(definition.accessoryNames).toContain(`${definition.id}-boot-left`);
      expect(definition.accessoryNames).toContain(`${definition.id}-boot-right`);
      expect(definition.kitRoughness).toBeGreaterThan(0.3);
      expect(definition.kitMetalness).toBeLessThan(0.5);
    }
    expect(
      new Set(Object.values(CHARACTER_VARIANT_VISUALS).map((variant) => variant.headStyle)),
    ).toHaveLength(6);
    expect(
      new Set(Object.values(CHARACTER_VARIANT_VISUALS).map((variant) => variant.bodyScale.join(','))),
    ).toHaveLength(6);
  });

  it('attaches accessories to the shared joints and switches one variant at a time', () => {
    const model = new THREE.Group();
    for (const joint of [
      'upperarm_l',
      'hand_l',
      'hand_r',
      'calf_l',
      'calf_r',
      'clavicle_l',
      'clavicle_r',
      'neck_01',
      'pelvis',
      'lowerarm_l',
      'lowerarm_r',
      'Head',
      'foot_l',
      'foot_r',
    ]) {
      const bone = new THREE.Bone();
      bone.name = joint;
      model.add(bone);
    }
    const controller = createImportedCharacterVariantController(model);
    controller.apply('tower');
    expect(model.userData.characterVariant).toBe('tower');
    expect(model.userData.sharedSkeleton).toBe(true);
    expect(model.scale.x).toBeGreaterThan(1);
    expect(model.getObjectByName('imported-character-variant-tower')?.visible).toBe(true);
    expect(model.getObjectByName('imported-character-variant-maestro')?.visible).toBe(false);
    expect(model.getObjectByName('character-accessory-shoulder-plate-left')).toBeDefined();
    expect(model.getObjectByName('character-accessory-iron-crop')).toBeDefined();
    expect(model.getObjectByName('character-accessory-tower-boot-left')).toBeDefined();
    expect(model.getObjectByName('character-accessory-shoulder-plate-left')?.visible).toBe(true);
    expect(model.getObjectByName('character-accessory-captain-armband')?.visible).toBe(false);
    controller.apply('maestro');
    expect(model.getObjectByName('character-accessory-shoulder-plate-left')?.visible).toBe(false);
    expect(model.getObjectByName('character-accessory-captain-armband')?.visible).toBe(true);
    controller.dispose();
    expect(model.getObjectByName('character-accessory-captain-armband')).toBeUndefined();
  });

  it('disposes owned accessory geometry and materials', () => {
    const model = new THREE.Group();
    const controller = createImportedCharacterVariantController(model);
    const geometry = model.getObjectByName('character-accessory-captain-armband') as THREE.Mesh;
    const disposeGeometry = vi.spyOn(geometry.geometry, 'dispose');
    const disposeMaterial = vi.spyOn(geometry.material as THREE.Material, 'dispose');
    controller.dispose();
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
  });
});
