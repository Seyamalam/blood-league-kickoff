import { describe, expect, it } from 'vitest';
import { DEFAULT_CUSTOM_CHARACTER } from '../../profile/CharacterCustomizationStore';
import { createCustomVoxelAppearanceController } from './CustomVoxelAppearance';
import { createVoxelHumanoid } from './VoxelHumanoid';

describe('custom voxel appearance controller', () => {
  it('switches authored patterns, aura, and build metadata on the shared rig', () => {
    const rig = createVoxelHumanoid({ castShadow: false });
    const controller = createCustomVoxelAppearanceController(rig);
    controller.apply({
      ...DEFAULT_CUSTOM_CHARACTER,
      enabled: true,
      bodyBuild: 'powerful',
      kitPattern: 'sash',
      auraStyle: 'gold',
    });

    expect(rig.root.getObjectByName('custom-kit-pattern-sash')?.visible).toBe(true);
    expect(rig.root.getObjectByName('custom-kit-pattern-classic')?.visible).toBe(false);
    expect(rig.root.getObjectByName('custom-player-voxel-aura')?.visible).toBe(true);
    expect(rig.root.userData).toMatchObject({
      customKitPattern: 'sash',
      customAura: 'gold',
      customBodyBuild: 'powerful',
    });
    expect(() => controller.update(1 / 60)).not.toThrow();

    controller.dispose();
    rig.dispose();
  });
});
