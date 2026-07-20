import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { EnemyArchetype } from '../../game/simulation/types';
import {
  chooseEnemyVisualLod,
  createEnemyCharacterPresentation,
  ENEMY_VISUAL_IDENTITIES,
  updateEnemyCharacterPose,
} from './EnemyCharacterVisual';

const ARCHETYPES = Object.keys(ENEMY_VISUAL_IDENTITIES) as EnemyArchetype[];
const HUMANOID_ARCHETYPES = ARCHETYPES.filter(
  (archetype): archetype is Exclude<EnemyArchetype, 'batSwarm'> => archetype !== 'batSwarm',
);

function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) result.push(object);
  });
  return result;
}

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
      expect(geometry.userData.visualStyle).toBe('voxel-block-built');
      expect(geometry.userData.bodyPrimitive).toBe('box');
      farGeometryIds.add(geometry.uuid);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBeGreaterThan(0.45);
    }
    expect(farGeometryIds).toHaveLength(11);
  });

  it('builds articulated humanoid anatomy entirely from voxel boxes at near LOD', () => {
    for (const archetype of HUMANOID_ARCHETYPES) {
      const presentation = createEnemyCharacterPresentation(archetype);
      expect(presentation.proceduralBody.userData.visualStyle).toBe('voxel-block-built');

      const anatomy = meshes(presentation.proceduralBody).filter(
        (candidate) => candidate.userData.anatomyPrimitive === 'box',
      );
      expect(anatomy.length, `${archetype} should expose its block anatomy`).toBeGreaterThanOrEqual(12);
      for (const part of anatomy) {
        expect(part.geometry, `${archetype}:${part.name} should use BoxGeometry`).toBeInstanceOf(
          THREE.BoxGeometry,
        );
      }

      for (const jointName of [
        'enemy-joint-left-arm',
        'enemy-joint-right-arm',
        'enemy-joint-left-leg',
        'enemy-joint-right-leg',
      ]) {
        const joint = presentation.proceduralBody.getObjectByName(jointName);
        expect(joint, `${archetype} should preserve ${jointName}`).toBeInstanceOf(THREE.Group);
      }
    }
  });

  it('keeps voxel body composition encoded in both merged distance LODs', () => {
    for (const archetype of ARCHETYPES) {
      const presentation = createEnemyCharacterPresentation(archetype);
      const midBody = presentation.mid.children.find((child) => child.name.endsWith('-mid-silhouette'));
      const farBody = presentation.far.children[0];

      expect(midBody).toBeInstanceOf(THREE.Mesh);
      expect((midBody as THREE.Mesh).geometry.userData.visualStyle).toBe('voxel-block-built');
      expect((midBody as THREE.Mesh).geometry.userData.bodyPrimitive).toBe('box');
      expect(farBody).toBeInstanceOf(THREE.Mesh);
      expect((farBody as THREE.Mesh).geometry.userData.visualStyle).toBe('voxel-block-built');
      expect((farBody as THREE.Mesh).geometry.userData.bodyPrimitive).toBe('box');
    }
  });

  it('keeps quality-scaled distance bands deterministic', () => {
    expect(chooseEnemyVisualLod(8 * 8, 'performance')).toBe('near');
    expect(chooseEnemyVisualLod(10 * 10, 'performance')).toBe('mid');
    expect(chooseEnemyVisualLod(24 * 24, 'performance')).toBe('far');
    expect(chooseEnemyVisualLod(17 * 17, 'quality')).toBe('near');
    expect(chooseEnemyVisualLod(30 * 30, 'quality')).toBe('mid');
    expect(chooseEnemyVisualLod(40 * 40, 'quality')).toBe('far');
  });

  it('gives fast, heavy, and hunched archetypes distinct authored movement postures', () => {
    const winger = createEnemyCharacterPresentation('winger');
    const defender = createEnemyCharacterPresentation('defender');
    const leech = createEnemyCharacterPresentation('leechStriker');

    updateEnemyCharacterPose(winger, 0.12, 1, true, 'chase', false);
    updateEnemyCharacterPose(defender, 0.12, 1, true, 'chase', false);
    updateEnemyCharacterPose(leech, 0.12, 1, true, 'chase', false);

    expect(Math.abs(winger.leftLeg!.rotation.x)).toBeGreaterThan(Math.abs(defender.leftLeg!.rotation.x));
    expect(leech.proceduralBody.rotation.x).toBeLessThan(-0.2);
    expect(defender.proceduralBody.rotation.x).toBeGreaterThan(0);
  });
});
