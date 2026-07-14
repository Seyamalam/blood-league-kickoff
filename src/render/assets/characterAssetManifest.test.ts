import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '../../game/characters/types';
import manifest from './character-asset-manifest.json';

interface ValidationReport {
  ok: boolean;
  errors: string[];
  character: {
    triangles: number;
    materials: number;
    textures: number;
    skins: Array<{ name: string; joints: number }>;
  };
  animations: { clips: Array<{ name: string }> };
}

describe('character asset manifest', () => {
  it('defines one compatible visual variant for every playable character', () => {
    expect(manifest.variants.map((variant) => variant.id)).toEqual([...CHARACTER_IDS]);
    expect(new Set(manifest.variants.map((variant) => variant.bodyProfile)).size).toBe(CHARACTER_IDS.length);
    expect(manifest.variantCompatibility.sharedSkeleton).toBe(true);
    expect(manifest.variantCompatibility.sharedAnimationLibrary).toBe(true);
  });

  it('tracks the full requested football animation surface', () => {
    expect(manifest.productionAnimationSlots.map((slot) => slot.slot)).toEqual(
      expect.arrayContaining([
        'dribble',
        'strafeLeft',
        'strafeRight',
        'groundPass',
        'lobPass',
        'shoot',
        'heading',
        'slideTackle',
        'bicycleKick',
        'damage',
        'knockdown',
        'celebration',
        'victory',
        'defeat',
      ]),
    );
  });

  it('passes the real GLB shipping gate', () => {
    const script = fileURLToPath(new URL('../../../scripts/validate-character-assets.mjs', import.meta.url));
    const report = JSON.parse(
      execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' }),
    ) as ValidationReport;

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.character.triangles).toBeLessThanOrEqual(manifest.shippingGate.maxTriangles);
    expect(report.character.materials).toBeLessThanOrEqual(manifest.shippingGate.maxMaterials);
    expect(report.character.textures).toBeLessThanOrEqual(manifest.shippingGate.maxTextures);
    expect(report.character.skins).toContainEqual({
      name: manifest.skeleton.skinName,
      joints: manifest.skeleton.jointCount,
    });
    expect(report.animations.clips.map((clip) => clip.name)).toEqual(
      expect.arrayContaining(manifest.runtimeRequiredClips),
    );
  });
});
