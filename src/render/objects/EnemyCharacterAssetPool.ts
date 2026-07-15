import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { EnemyArchetype, EnemyAttackState } from '../../game/simulation/types';
import type { RenderQuality } from '../../settings/SettingsStore';
import type { EnemyCharacterPresentation } from './EnemyCharacterVisual';

const CHARACTER_URL = '/assets/vendor/quaternius/night-striker.glb';
const ANIMATION_URL = '/assets/vendor/quaternius/universal-animation-library.glb';
const NEAR_DISTANCE_SQUARED = 18 * 18;

interface TrackedEnemy {
  readonly id: number;
  readonly archetype: EnemyArchetype;
  readonly presentation: EnemyCharacterPresentation;
  distanceSquared: number;
  moving: boolean;
  attackState: EnemyAttackState;
  hit: boolean;
  instance?: ImportedEnemy;
}

interface ImportedEnemy {
  readonly root: THREE.Group;
  readonly mixer: THREE.AnimationMixer;
  readonly actions: ReadonlyMap<string, THREE.AnimationAction>;
  readonly ownedMaterials: readonly THREE.Material[];
  activeClip: string;
  lastAttackState: EnemyAttackState;
}

export function enemyImportedCharacterBudget(quality: RenderQuality): number {
  if (quality === 'performance') return 8;
  if (quality === 'quality') return 16;
  return 12;
}

function clipFor(enemy: TrackedEnemy): string {
  if (enemy.hit) return 'Hit_A';
  if (enemy.attackState === 'lunge' || enemy.attackState === 'drain') return 'Punch_Cross';
  if (enemy.attackState === 'volley') return 'Spell_Simple_Shoot';
  if (enemy.attackState === 'whistle') return 'Idle_Talking_Loop';
  if (enemy.moving)
    return enemy.archetype === 'winger' || enemy.archetype === 'shadowRunner'
      ? 'Sprint_Loop'
      : 'Jog_Fwd_Loop';
  return 'Idle_Loop';
}

/**
 * Keeps real skinned GLBs on only the nearest enemies. The articulated procedural
 * presentation remains an automatic loading, compatibility, and crowd fallback.
 */
export class EnemyCharacterAssetPool {
  private readonly tracked = new Map<number, TrackedEnemy>();
  private source?: THREE.Group;
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private disposed = false;
  private assignmentTimer = 0;

  constructor() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    const loader = new GLTFLoader();
    void Promise.all([loader.loadAsync(CHARACTER_URL), loader.loadAsync(ANIMATION_URL)])
      .then(([character, animations]) => {
        if (this.disposed) return;
        this.source = character.scene;
        for (const clip of animations.animations) this.clips.set(clip.name, clip);
        animations.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            const surfaces = Array.isArray(node.material) ? node.material : [node.material];
            for (const surface of surfaces) surface.dispose();
          }
        });
      })
      .catch((error: unknown) => {
        console.warn('Enemy character GLB unavailable; keeping articulated fallback.', error);
      });
  }

  register(id: number, archetype: EnemyArchetype, presentation: EnemyCharacterPresentation): void {
    this.tracked.set(id, {
      id,
      archetype,
      presentation,
      distanceSquared: Number.POSITIVE_INFINITY,
      moving: false,
      attackState: 'chase',
      hit: false,
    });
  }

  track(
    id: number,
    distanceSquared: number,
    moving: boolean,
    attackState: EnemyAttackState,
    hit: boolean,
  ): void {
    const enemy = this.tracked.get(id);
    if (!enemy) return;
    enemy.distanceSquared = distanceSquared;
    enemy.moving = moving;
    enemy.attackState = attackState;
    enemy.hit = hit;
  }

  unregister(id: number): void {
    const enemy = this.tracked.get(id);
    if (!enemy) return;
    this.detach(enemy);
    this.tracked.delete(id);
  }

  update(dt: number, quality: RenderQuality): void {
    this.assignmentTimer -= dt;
    if (this.assignmentTimer <= 0) {
      this.assignmentTimer = 0.25;
      const selected = new Set(
        [...this.tracked.values()]
          .filter((enemy) => enemy.archetype !== 'batSwarm' && enemy.distanceSquared <= NEAR_DISTANCE_SQUARED)
          .sort((left, right) => left.distanceSquared - right.distanceSquared || left.id - right.id)
          .slice(0, enemyImportedCharacterBudget(quality))
          .map((enemy) => enemy.id),
      );
      for (const enemy of this.tracked.values()) {
        if (selected.has(enemy.id)) this.attach(enemy);
        else this.detach(enemy);
      }
    }

    for (const enemy of this.tracked.values()) {
      const instance = enemy.instance;
      if (!instance) continue;
      instance.root.visible = enemy.presentation.lod === 'near';
      enemy.presentation.proceduralBody.visible = !instance.root.visible;
      if (!instance.root.visible) continue;
      const desiredClip = clipFor(enemy);
      const attackStarted = enemy.attackState !== instance.lastAttackState && enemy.attackState !== 'chase';
      instance.lastAttackState = enemy.attackState;
      if (desiredClip !== instance.activeClip || attackStarted)
        this.play(instance, desiredClip, attackStarted);
      instance.mixer.update(dt);
    }
  }

  clear(): void {
    for (const enemy of this.tracked.values()) this.detach(enemy);
    this.tracked.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    if (this.source) {
      this.source.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        const surfaces = Array.isArray(node.material) ? node.material : [node.material];
        for (const surface of surfaces) surface.dispose();
      });
    }
    this.source = undefined;
    this.clips.clear();
  }

  private attach(enemy: TrackedEnemy): void {
    if (enemy.instance || !this.source) return;
    const root = cloneSkinned(this.source) as THREE.Group;
    root.name = 'enemy-imported-character';
    root.rotation.y = Math.PI;
    const ownedMaterials: THREE.Material[] = [];
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = false;
      const tint = enemyImportedCharacterTint(enemy.archetype);
      const cloneMaterial = (surface: THREE.Material): THREE.Material => {
        const copy = surface.clone();
        if (copy instanceof THREE.MeshStandardMaterial) {
          copy.color.multiply(new THREE.Color(tint));
          copy.roughness = enemy.archetype === 'shadowRunner' ? 0.35 : 0.6;
          copy.metalness =
            enemy.archetype === 'defender' || enemy.archetype === 'goalkeeperBrute' ? 0.24 : 0.08;
          copy.emissive.setHex(tint);
          copy.emissiveIntensity =
            enemy.archetype === 'coach' || enemy.archetype === 'corpseBomber' ? 0.22 : 0.08;
        }
        ownedMaterials.push(copy);
        return copy;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(cloneMaterial)
        : cloneMaterial(node.material);
    });
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const name of [
      'Idle_Loop',
      'Jog_Fwd_Loop',
      'Sprint_Loop',
      'Punch_Cross',
      'Spell_Simple_Shoot',
      'Idle_Talking_Loop',
      'Hit_A',
    ]) {
      const clip = this.clips.get(name);
      if (clip) actions.set(name, mixer.clipAction(clip));
    }
    enemy.presentation.near.add(root);
    root.userData.enemyArchetype = enemy.archetype;
    root.userData.enemyImportedIdentity = true;
    enemy.presentation.proceduralBody.visible = false;
    enemy.instance = { root, mixer, actions, ownedMaterials, activeClip: '', lastAttackState: 'chase' };
    this.play(enemy.instance, 'Idle_Loop', false);
  }

  private detach(enemy: TrackedEnemy): void {
    const instance = enemy.instance;
    if (!instance) return;
    instance.mixer.stopAllAction();
    instance.mixer.uncacheRoot(instance.root);
    enemy.presentation.near.remove(instance.root);
    for (const surface of instance.ownedMaterials) surface.dispose();
    enemy.presentation.proceduralBody.visible = true;
    enemy.instance = undefined;
  }

  private play(instance: ImportedEnemy, name: string, restart: boolean): void {
    const next = instance.actions.get(name) ?? instance.actions.get('Idle_Loop');
    if (!next) return;
    const previous = instance.actions.get(instance.activeClip);
    if (previous !== next) {
      previous?.fadeOut(0.12);
      next.reset().fadeIn(0.12).play();
    } else if (restart) next.reset().play();
    instance.activeClip = name;
  }
}

export function enemyImportedCharacterTint(archetype: EnemyArchetype): number {
  const colors: Readonly<Record<EnemyArchetype, number>> = {
    bloodFan: 0xa33b68,
    winger: 0xd6335e,
    defender: 0x6f4a8b,
    coach: 0xb88a38,
    batSwarm: 0x382543,
    leechStriker: 0x8d365e,
    corruptReferee: 0xc7c2b9,
    bloodArcher: 0x9c3d54,
    shadowRunner: 0x514675,
    corpseBomber: 0x9a593c,
    goalkeeperBrute: 0x594476,
  };
  return colors[archetype];
}
