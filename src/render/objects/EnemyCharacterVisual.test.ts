import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { EnemyArchetype } from '../../game/simulation/types';
import {
  chooseEnemyVisualLod,
  createEnemyCharacterPresentation,
  ENEMY_VISUAL_IDENTITIES,
} from './EnemyCharacterVisual';

const ARCHETYPES = Object.keys(ENEMY_VISUAL_IDENTITIES) as EnemyArchetype[];

describe('enemy character visual identities', () => {
  it('assigns unique semantic silhouettes and signature equipment to all eleven archetypes', () => {
    expect(ARCHETYPES).toHaveLength(11);
    expect(
      new Set(Object.values(ENEMY_VISUAL_IDENTITIES).map((identity) => identity.silhouette)),
    ).toHaveLength(11);
    expect(
      new Set(Object.values(ENEMY_VISUAL_IDENTITIES).map((identity) => identity.signatureEquipment)),
    ).toHaveLength(11);

    for (const archetype of ARCHETYPES) {
      const presentation = createEnemyCharacterPresentation(archetype);
      expect(presentation.lodRoot.userData.enemySilhouette).toBe(
        ENEMY_VISUAL_IDENTITIES[archetype].silhouette,
      );
      expect(presentation.lodRoot.userData.enemySignatureEquipment).toBe(
        ENEMY_VISUAL_IDENTITIES[archetype].signatureEquipment,
      );
    }
  });

  it('uses a two-material recognizable mid LOD and a single merged far LOD', () => {
    const farGeometryIds = new Set<string>();
    for (const archetype of ARCHETYPES) {
      const presentation = createEnemyCharacterPresentation(archetype);
      expect(presentation.mid.children).toHaveLength(2);
      const midNames = presentation.mid.children.map((child) => child.name);
      expect(midNames.some((name) => name.endsWith('-mid-silhouette'))).toBe(true);
      expect(midNames.some((name) => name.endsWith('-mid-signature'))).toBe(true);
      expect(presentation.far.children).toHaveLength(1);
      const farMesh = presentation.far.children[0];
      expect(farMesh).toBeInstanceOf(THREE.Mesh);
      const geometry = (farMesh as THREE.Mesh).geometry;
      farGeometryIds.add(geometry.uuid);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBeGreaterThan(0.45);
    }
    expect(farGeometryIds).toHaveLength(11);
  });

  it('keeps quality-scaled distance bands deterministic', () => {
    expect(chooseEnemyVisualLod(8 * 8, 'performance')).toBe('near');
    expect(chooseEnemyVisualLod(10 * 10, 'performance')).toBe('mid');
    expect(chooseEnemyVisualLod(24 * 24, 'performance')).toBe('far');
    expect(chooseEnemyVisualLod(17 * 17, 'quality')).toBe('near');
    expect(chooseEnemyVisualLod(30 * 30, 'quality')).toBe('mid');
    expect(chooseEnemyVisualLod(40 * 40, 'quality')).toBe('far');
  });
});
