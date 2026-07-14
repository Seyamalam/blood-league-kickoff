import * as THREE from 'three';
import type { AnimationActionLoopStyles } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PlayerState } from '../../game/simulation/types';
import type { CharacterId } from '../../game/characters';
import {
  createImportedCharacterVariantController,
  type ImportedCharacterVariantController,
} from './PlayerCharacterVariants';
import {
  resolveFootballAnimationContract,
  type FootballAnimationResolution,
  type FootballAnimationState,
} from './FootballAnimationContract';

const CHARACTER_URL = '/assets/vendor/quaternius/night-striker.glb';
const ANIMATION_URL = '/assets/vendor/quaternius/universal-animation-library.glb';

export type PlayerTechnique = 'kick' | 'ground-pass' | 'lob-pass' | 'bicycle';

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
  private footballAnimations: ReadonlyMap<FootballAnimationState, FootballAnimationResolution> = new Map();
  private activeAction?: THREE.AnimationAction;
  private activeClip = '';
  private oneShotRemaining = 0;
  private previousDashTime = 0;
  private disposed = false;
  private selectedCharacterId: CharacterId = 'maestro';
  private variantController?: ImportedCharacterVariantController;

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
        this.variantController = createImportedCharacterVariantController(model);
        this.variantController.apply(this.selectedCharacterId);
        this.mixer = new THREE.AnimationMixer(model);
        for (const clip of animationLibrary.animations) this.clips.set(clip.name, clip);
        this.footballAnimations = resolveFootballAnimationContract(this.clips.keys());
        disposeObject(animationLibrary.scene);
        this.playFootballAnimation('idle', 0);
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
    if (dashStarted) this.playFootballAnimation('slideTackle', 0.06);
    this.oneShotRemaining = Math.max(0, this.oneShotRemaining - dt);
    if (this.oneShotRemaining === 0) {
      this.transitionTo(locomotionClipFor(speed, false));
    }
    this.mixer.update(dt);
  }

  playTechnique(technique: PlayerTechnique): void {
    const animation: FootballAnimationState =
      technique === 'bicycle'
        ? 'bicycleKick'
        : technique === 'ground-pass'
          ? 'groundPass'
          : technique === 'lob-pass'
            ? 'lobPass'
            : 'shoot';
    this.playFootballAnimation(animation, 0.06);
  }

  setCharacter(id: CharacterId): void {
    this.selectedCharacterId = id;
    this.variantController?.apply(id);
  }

  /** Plays a stable semantic state, resolving a dedicated clip or documented fallback alias. */
  playFootballAnimation(state: FootballAnimationState, fade = 0.1): FootballAnimationResolution | undefined {
    const resolution = this.footballAnimations.get(state);
    if (!resolution?.clipName) return resolution;
    if (resolution.playback === 'loop') {
      this.oneShotRemaining = 0;
      this.transitionTo(resolution.clipName, fade);
      return resolution;
    }

    const clip = this.clips.get(resolution.clipName);
    if (!clip) return { ...resolution, clipName: undefined, source: 'unavailable' };
    this.transitionTo(resolution.clipName, fade, THREE.LoopOnce, true);
    this.oneShotRemaining =
      resolution.playback === 'terminal' ? Number.POSITIVE_INFINITY : Math.max(0.12, clip.duration * 0.92);
    return resolution;
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.variantController?.dispose();
    this.variantController = undefined;
    if (this.importedRoot) {
      this.fallbackRoot.remove(this.importedRoot);
      disposeObject(this.importedRoot);
    }
    this.importedRoot = undefined;
    this.mixer = undefined;
    this.clips.clear();
    this.footballAnimations = new Map();
  }

  private transitionTo(
    name: string,
    fade = 0.16,
    loop: AnimationActionLoopStyles = THREE.LoopRepeat,
    forceRestart = false,
  ): void {
    if (!this.mixer || (!forceRestart && this.activeClip === name)) return;
    const clip = this.clips.get(name);
    if (!clip) return;
    const next = this.mixer.clipAction(clip);
    const previous = this.activeAction;
    const restartingActiveAction = previous === next;
    if (restartingActiveAction) next.stop();
    next.enabled = true;
    next.reset();
    next.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
    next.clampWhenFinished = loop === THREE.LoopOnce;
    next.fadeIn(fade).play();
    if (previous && !restartingActiveAction) previous.fadeOut(fade);
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
