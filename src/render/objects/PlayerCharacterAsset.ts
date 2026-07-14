import * as THREE from 'three';
import type { AnimationActionLoopStyles } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PlayerState } from '../../game/simulation/types';

const CHARACTER_URL = '/assets/vendor/quaternius/night-striker.glb';
const ANIMATION_URL = '/assets/vendor/quaternius/universal-animation-library.glb';

type Technique = 'kick' | 'bicycle';

export function locomotionClipFor(speed: number, dashing: boolean): string {
  if (dashing) return 'Roll';
  if (speed > 7.5) return 'Sprint_Loop';
  if (speed > 0.15) return 'Jog_Fwd_Loop';
  return 'Idle_Loop';
}

/**
 * Asynchronously swaps the procedural player for the audited Quaternius CC0
 * skinned model. Simulation remains authoritative and the procedural model is
 * retained as a no-network/no-WebGL-asset fallback.
 */
export class PlayerCharacterAsset {
  private importedRoot?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private activeAction?: THREE.AnimationAction;
  private activeClip = '';
  private oneShotRemaining = 0;
  private previousDashTime = 0;
  private disposed = false;

  constructor(private readonly fallbackRoot: THREE.Group) {}

  get ready(): boolean {
    return this.importedRoot !== undefined;
  }

  load(): void {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    const loader = new GLTFLoader();
    void Promise.all([loader.loadAsync(CHARACTER_URL), loader.loadAsync(ANIMATION_URL)])
      .then(([character, animationLibrary]) => {
        if (this.disposed) {
          disposeObject(character.scene);
          disposeObject(animationLibrary.scene);
          return;
        }
        const model = character.scene;
        model.name = 'player-imported-model';
        model.rotation.y = Math.PI;
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = false;
            node.frustumCulled = false;
          }
        });
        for (const child of this.fallbackRoot.children) child.visible = false;
        this.fallbackRoot.add(model);
        this.importedRoot = model;
        this.mixer = new THREE.AnimationMixer(model);
        for (const clip of animationLibrary.animations) this.clips.set(clip.name, clip);
        disposeObject(animationLibrary.scene);
        this.transitionTo('Idle_Loop', 0);
      })
      .catch((error: unknown) => {
        // A missing or rejected model must never prevent kickoff.
        console.warn('CC0 character asset unavailable; using procedural fallback.', error);
      });
  }

  update(dt: number, player: PlayerState): void {
    if (!this.mixer) return;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const dashStarted = player.dashTime > 0 && this.previousDashTime <= 0;
    this.previousDashTime = player.dashTime;
    if (dashStarted) this.playOneShot('Roll');
    this.oneShotRemaining = Math.max(0, this.oneShotRemaining - dt);
    if (this.oneShotRemaining === 0) {
      this.transitionTo(locomotionClipFor(speed, false));
    }
    this.mixer.update(dt);
  }

  playTechnique(technique: Technique): void {
    this.playOneShot(technique === 'bicycle' ? 'Roll' : 'Punch_Cross');
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.importedRoot) {
      this.fallbackRoot.remove(this.importedRoot);
      disposeObject(this.importedRoot);
    }
    this.importedRoot = undefined;
    this.mixer = undefined;
    this.clips.clear();
  }

  private playOneShot(name: string): void {
    const clip = this.clips.get(name);
    if (!clip) return;
    this.transitionTo(name, 0.06, THREE.LoopOnce);
    this.oneShotRemaining = Math.max(0.12, clip.duration * 0.82);
  }

  private transitionTo(name: string, fade = 0.16, loop: AnimationActionLoopStyles = THREE.LoopRepeat): void {
    if (!this.mixer || this.activeClip === name) return;
    const clip = this.clips.get(name);
    if (!clip) return;
    const next = this.mixer.clipAction(clip);
    next.enabled = true;
    next.reset();
    next.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
    next.clampWhenFinished = loop === THREE.LoopOnce;
    next.fadeIn(fade).play();
    this.activeAction?.fadeOut(fade);
    this.activeAction = next;
    this.activeClip = name;
  }
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
