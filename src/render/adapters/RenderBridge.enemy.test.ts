import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createGameState, spawnEnemyAt } from '../../game/simulation/gameState';
import type { EnemyArchetype, EnemyState, GameState } from '../../game/simulation/types';
import { RenderBridge } from './RenderBridge';

const ARCHETYPES: readonly EnemyArchetype[] = [
  'bloodFan',
  'winger',
  'defender',
  'coach',
  'batSwarm',
  'leechStriker',
  'corruptReferee',
  'goalkeeperBrute',
  'bloodArcher',
  'shadowRunner',
  'corpseBomber',
];

const REQUIRED_PARTS: Readonly<Record<EnemyArchetype, readonly string[]>> = {
  bloodFan: ['blood-fan-cloak', 'blood-fan-head'],
  winger: ['winger-body', 'winger-wing-left', 'winger-wing-right'],
  defender: ['defender-body', 'defender-shield'],
  coach: ['coach-body', 'coach-aura'],
  batSwarm: ['bat-body', 'bat-wing-left', 'bat-wing-right', 'bat-ears'],
  leechStriker: ['leech-body', 'leech-mouth', 'leech-drain-ring'],
  corruptReferee: ['referee-body', 'referee-stripes', 'referee-whistle', 'referee-whistle-ring'],
  goalkeeperBrute: ['brute-body', 'brute-glove-left', 'brute-glove-right', 'brute-catch-ring'],
  bloodArcher: ['archer-body', 'archer-bow', 'archer-head'],
  shadowRunner: ['shadow-body', 'shadow-veil', 'shadow-teleport-ring'],
  corpseBomber: ['bomber-body', 'bomber-fuse', 'bomber-blast-ring'],
};

function addRoster(state: GameState, xOffset = 0): EnemyState[] {
  return ARCHETYPES.map((archetype, index) =>
    spawnEnemyAt(state, archetype, {
      x: xOffset + (index % 4) * 2,
      y: 0.9,
      z: Math.floor(index / 4) * 2,
    }),
  );
}

function sync(bridge: RenderBridge, state: GameState): void {
  bridge.sync(state, { x: 0, y: 0.42, z: 0 }, 0, 1 / 60, 1);
}

function enemyRoots(scene: THREE.Scene): THREE.Group[] {
  return scene.children.filter(
    (child): child is THREE.Group =>
      child instanceof THREE.Group && typeof child.userData.enemyArchetype === 'string',
  );
}

function enemyMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  return meshes;
}

function triangleCount(mesh: THREE.Mesh): number {
  return (mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0) / 3;
}

describe('RenderBridge enemy visuals', () => {
  it('keeps every archetype identifiable within the ordinary-enemy mesh and triangle budgets', () => {
    const state = createGameState();
    addRoster(state);
    const scene = new THREE.Scene();
    const bridge = new RenderBridge(scene);

    try {
      sync(bridge, state);
      const roots = enemyRoots(scene);
      expect(roots).toHaveLength(ARCHETYPES.length);
      expect(new Set(roots.map((root) => root.userData.enemyArchetype))).toEqual(new Set(ARCHETYPES));

      for (const root of roots) {
        const archetype = root.userData.enemyArchetype as EnemyArchetype;
        expect(root.name).toMatch(/^enemy-\d+$/);
        expect(root.getObjectByName('enemy-body-root')).toBeInstanceOf(THREE.Group);
        expect(root.getObjectByName('enemy-threat-marker')).toBeInstanceOf(THREE.Mesh);
        for (const partName of REQUIRED_PARTS[archetype]) {
          expect(root.getObjectByName(partName), `${archetype} should include ${partName}`).toBeDefined();
        }
        for (const groundCueName of ['coach-aura', 'leech-drain-ring', 'referee-whistle-ring']) {
          const groundCue = root.getObjectByName(groundCueName);
          if (groundCue) expect(groundCue.parent).toBe(root);
        }

        const visibleMeshes = enemyMeshes(root).filter((mesh) => mesh.visible);
        expect(visibleMeshes.length, `${archetype} visible mesh count`).toBeLessThanOrEqual(5);
        expect(
          visibleMeshes.reduce((total, mesh) => total + triangleCount(mesh), 0),
          `${archetype} visible triangle count`,
        ).toBeLessThanOrEqual(1_500);
      }
    } finally {
      bridge.dispose();
    }
  });

  it('renders attack, defense, and elite states with shape-based cues', () => {
    const state = createGameState();
    const [, winger, defender, , , leech, referee, brute] = addRoster(state);
    winger!.elite = true;
    winger!.attackState = 'lunge';
    winger!.attackDirection = { x: 1, y: 0, z: 0 };
    defender!.shieldFlash = 0.2;
    leech!.attackState = 'drain';
    referee!.attackState = 'whistle';
    brute!.shieldFlash = 0.2;

    const scene = new THREE.Scene();
    const bridge = new RenderBridge(scene);
    try {
      sync(bridge, state);
      const wingerRoot = scene.getObjectByName(`enemy-${winger!.id}`)!;
      expect(wingerRoot.rotation.y).toBeCloseTo(Math.PI / 2);
      expect(wingerRoot.scale.x).toBeCloseTo(1.18);
      expect(wingerRoot.getObjectByName('elite-marker')).toBeInstanceOf(THREE.Mesh);
      expect(Math.abs(wingerRoot.getObjectByName('winger-wing-left')!.rotation.z)).toBeLessThan(0.5);

      const shield = scene.getObjectByName('defender-shield')!;
      expect(shield.position.z).toBeLessThan(0.42);
      expect(shield.scale.z).toBe(1.65);

      const drainRing = scene.getObjectByName('leech-drain-ring')!;
      expect(drainRing.visible).toBe(true);
      expect(scene.getObjectByName('leech-mouth')!.scale.x).toBeGreaterThan(1);

      const whistleRing = scene.getObjectByName('referee-whistle-ring')!;
      expect(whistleRing.visible).toBe(true);
      expect(whistleRing.scale.x).toBe(1.8);
      expect(scene.getObjectByName('referee-whistle')!.position.z).toBeGreaterThan(0.39);

      expect(scene.getObjectByName('brute-catch-ring')!.visible).toBe(true);
      expect(scene.getObjectByName('brute-glove-left')!.position.x).toBeGreaterThan(-0.92);
      expect(scene.getObjectByName('brute-glove-right')!.position.x).toBeLessThan(0.92);
    } finally {
      bridge.dispose();
    }
  });

  it('shares roster resources and keeps every transparent cue depth-safe', () => {
    const state = createGameState();
    addRoster(state);
    const scene = new THREE.Scene();
    const bridge = new RenderBridge(scene);
    try {
      sync(bridge, state);
      const firstMeshes = enemyRoots(scene).flatMap(enemyMeshes);
      const firstGeometries = new Set(firstMeshes.map((mesh) => mesh.geometry));
      const firstMaterials = new Set(
        firstMeshes.flatMap((mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material])),
      );

      addRoster(state, 10);
      sync(bridge, state);
      const allMeshes = enemyRoots(scene).flatMap(enemyMeshes);
      expect(new Set(allMeshes.map((mesh) => mesh.geometry))).toEqual(firstGeometries);
      expect(
        new Set(
          allMeshes.flatMap((mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material])),
        ),
      ).toEqual(firstMaterials);

      for (const mesh of allMeshes) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (material.transparent || material.opacity < 1) expect(material.depthWrite).toBe(false);
        }
      }
    } finally {
      bridge.dispose();
    }
  });
});
