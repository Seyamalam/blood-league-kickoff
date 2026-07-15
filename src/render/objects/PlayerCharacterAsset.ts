import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PlayerState } from '../../game/simulation/types';
import type { CharacterId } from '../../game/characters';
import {
  createImportedCharacterVariantController,
  type ImportedCharacterVariantController,
} from './PlayerCharacterVariants';
import {
  resolveFootballAnimationContract,
  getFootballAnimationPresentation,
  type FootballAnimationResolution,
  type FootballAnimationState,
  type FootballAnimationContactEvent,
  type FootballAnimationContactSocket,
} from './FootballAnimationContract';
import { CharacterAnimationController } from './CharacterAnimationController';

const CHARACTER_URL = '/assets/vendor/quaternius/night-striker.glb';
const ANIMATION_URL = '/assets/vendor/quaternius/universal-animation-library.glb';

export type PlayerTechnique = 'kick' | 'ground-pass' | 'lob-pass' | 'header' | 'slide-tackle' | 'bicycle';
export type PlayerReaction = 'damage' | 'knockdown';
export type PlayerOutcome = 'celebration' | 'victory' | 'defeat';

const ANIMATION_PRIORITY = {
  locomotion: 10,
  technique: 50,
  damage: 70,
  knockdown: 80,
  terminal: 100,
} as const;

export interface PlayerCharacterAssetOptions {
  /** Disabled by default; intended only for local web rig inspection. */
  readonly showSkeleton?: boolean;
}

export function rigDiagnosticsRequested(search: string, isDevelopment: boolean): boolean {
  return isDevelopment && new URLSearchParams(search).get('rigDebug') === '1';
}

export function techniqueAnimationFor(technique: PlayerTechnique): FootballAnimationState {
  if (technique === 'bicycle') return 'bicycleKick';
  if (technique === 'ground-pass') return 'groundPass';
  if (technique === 'lob-pass') return 'lobPass';
  if (technique === 'header') return 'header';
  if (technique === 'slide-tackle') return 'slideTackle';
  return 'shoot';
}

/** Resolves movement relative to facing without ever affecting simulation movement. */
export function locomotionStateFor(
  speed: number,
  forwardSpeed: number,
  lateralSpeed: number,
): Extract<FootballAnimationState, 'idle' | 'dribble' | 'strafeLeft' | 'strafeRight'> {
  if (speed <= 0.15) return 'idle';
  if (Math.abs(lateralSpeed) > Math.abs(forwardSpeed) * 1.15) {
    return lateralSpeed < 0 ? 'strafeLeft' : 'strafeRight';
  }
  return 'dribble';
}

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
  private animationController?: CharacterAnimationController;
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private footballAnimations: ReadonlyMap<FootballAnimationState, FootballAnimationResolution> = new Map();
  private skeletonHelper?: THREE.SkeletonHelper;
  private readonly contactEvents: FootballAnimationContactEvent[] = [];
  private previousDashTime = 0;
  private previousHealth?: number;
  private terminalState?: Extract<FootballAnimationState, 'victory' | 'defeat'>;
  private disposed = false;
  private selectedCharacterId: CharacterId = 'maestro';
  private variantController?: ImportedCharacterVariantController;

  constructor(
    private readonly fallbackRoot: THREE.Group,
    private readonly options: PlayerCharacterAssetOptions = {},
  ) {}

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
        this.animationController = new CharacterAnimationController(this.mixer, this.clips.values());
        this.footballAnimations = resolveFootballAnimationContract(this.clips.keys());
        this.setRigDiagnosticsEnabled(
          this.options.showSkeleton ?? rigDiagnosticsRequested(window.location.search, import.meta.env.DEV),
        );
        disposeObject(animationLibrary.scene);
        this.playFootballAnimation('idle', 0);
      })
      .catch((error: unknown) => {
        // A missing or rejected model must never prevent kickoff.
        console.warn('CC0 character asset unavailable; using procedural fallback.', error);
      });
  }

  update(dt: number, player: PlayerState): void {
    if (!this.animationController) return;
    this.animationController.update(dt);
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const forwardSpeed =
      player.velocity.x * Math.sin(player.facing) + player.velocity.z * Math.cos(player.facing);
    const lateralSpeed =
      player.velocity.x * Math.cos(player.facing) - player.velocity.z * Math.sin(player.facing);
    const dashStarted = player.dashTime > 0 && this.previousDashTime <= 0;
    this.previousDashTime = player.dashTime;
    const tookDamage = this.previousHealth !== undefined && player.health < this.previousHealth;
    this.previousHealth = player.health;
    if (!this.terminalState && tookDamage) {
      this.playReaction(player.health <= 0 ? 'knockdown' : 'damage');
    } else if (!this.terminalState && dashStarted) {
      this.playFootballAnimation('slideTackle', 0.06);
    }
    if (!this.terminalState && !this.animationController.isBaseLocked) {
      // Preserve the pack's authored sprint at high speed; use semantic states
      // elsewhere so dedicated football clips are picked up automatically.
      if (speed > 7.5) this.transitionTo(locomotionClipFor(speed, false));
      else this.playFootballAnimation(locomotionStateFor(speed, forwardSpeed, lateralSpeed));
    }
  }

  playTechnique(technique: PlayerTechnique): void {
    this.playFootballAnimation(techniqueAnimationFor(technique), 0.06);
  }

  setCharacter(id: CharacterId): void {
    this.selectedCharacterId = id;
    this.variantController?.apply(id);
  }

  playReaction(reaction: PlayerReaction): FootballAnimationResolution | undefined {
    if (this.terminalState) return this.footballAnimations.get(reaction);
    return this.playFootballAnimation(reaction, 0.06);
  }

  /**
   * Optional render-only overlay hook for future web-authored clips. For safety,
   * only animation names explicitly marked `Additive_*` or `*_Additive` play.
   */
  playAdditiveOverlay(name: string, weight = 1): boolean {
    return this.animationController?.playAdditiveOverlay({ name, weight }) ?? false;
  }

  /** Drains render-only contact markers emitted on authored clip timing. */
  drainContactEvents(): readonly FootballAnimationContactEvent[] {
    return this.contactEvents.splice(0);
  }

  /** Enables a local SkeletonHelper without affecting the rig or simulation. */
  setRigDiagnosticsEnabled(enabled: boolean): void {
    if (!this.importedRoot) return;
    if (enabled && !this.skeletonHelper) {
      this.skeletonHelper = new THREE.SkeletonHelper(this.importedRoot);
      this.skeletonHelper.name = 'player-rig-diagnostics';
      this.skeletonHelper.renderOrder = 1000;
      this.fallbackRoot.add(this.skeletonHelper);
    }
    if (this.skeletonHelper) this.skeletonHelper.visible = enabled;
  }

  playOutcome(outcome: PlayerOutcome): FootballAnimationResolution | undefined {
    const result = this.playFootballAnimation(outcome, 0.12);
    if (result?.clipName && (outcome === 'victory' || outcome === 'defeat')) this.terminalState = outcome;
    return result;
  }

  /** Clears terminal/one-shot presentation state when a match is restarted. */
  resetPresentation(): void {
    this.terminalState = undefined;
    this.previousHealth = undefined;
    this.previousDashTime = 0;
    this.animationController?.reset();
    this.contactEvents.length = 0;
    this.playFootballAnimation('idle', 0.08);
  }

  /** Plays a stable semantic state, resolving a dedicated clip or documented fallback alias. */
  playFootballAnimation(state: FootballAnimationState, fade = 0.1): FootballAnimationResolution | undefined {
    const resolution = this.footballAnimations.get(state);
    if (!resolution?.clipName) return resolution;
    if (resolution.playback === 'loop') {
      this.transitionTo(resolution.clipName, fade, ANIMATION_PRIORITY.locomotion);
      return resolution;
    }

    const clip = this.clips.get(resolution.clipName);
    if (!clip) return { ...resolution, clipName: undefined, source: 'unavailable' };
    const priority =
      resolution.playback === 'terminal'
        ? ANIMATION_PRIORITY.terminal
        : state === 'knockdown'
          ? ANIMATION_PRIORITY.knockdown
          : state === 'damage'
            ? ANIMATION_PRIORITY.damage
            : ANIMATION_PRIORITY.technique;
    const presentation = getFootballAnimationPresentation(state);
    this.transitionTo(resolution.clipName, fade, priority, THREE.LoopOnce, true, {
      terminal: resolution.playback === 'terminal',
      releaseAfter: Math.max(0.12, clip.duration * presentation.recoverAt),
      contactAt: presentation.contactAt,
      onContact:
        presentation.contactSocket === undefined
          ? undefined
          : () => this.emitContact(state, resolution.clipName!, presentation.contactSocket!),
    });
    return resolution;
  }

  dispose(): void {
    this.disposed = true;
    this.animationController?.dispose();
    this.animationController = undefined;
    this.variantController?.dispose();
    this.variantController = undefined;
    if (this.importedRoot) {
      this.fallbackRoot.remove(this.importedRoot);
      disposeObject(this.importedRoot);
    }
    if (this.skeletonHelper) {
      this.fallbackRoot.remove(this.skeletonHelper);
      this.skeletonHelper.geometry.dispose();
      const helperMaterials = Array.isArray(this.skeletonHelper.material)
        ? this.skeletonHelper.material
        : [this.skeletonHelper.material];
      for (const material of helperMaterials) material.dispose();
      this.skeletonHelper = undefined;
    }
    this.importedRoot = undefined;
    this.mixer = undefined;
    this.clips.clear();
    this.footballAnimations = new Map();
    this.contactEvents.length = 0;
    this.previousHealth = undefined;
    this.terminalState = undefined;
  }

  private transitionTo(
    name: string,
    fade = 0.16,
    priority: number = ANIMATION_PRIORITY.locomotion,
    loop: THREE.AnimationActionLoopStyles = THREE.LoopRepeat,
    forceRestart = false,
    options: {
      readonly terminal?: boolean;
      readonly releaseAfter?: number;
      readonly contactAt?: number;
      readonly onContact?: () => void;
    } = {},
  ): void {
    this.animationController?.playBase({
      name,
      fade,
      priority,
      loop,
      forceRestart,
      terminal: options.terminal,
      releaseAfter: options.releaseAfter,
      contactAt: options.contactAt,
      onContact: options.onContact,
    });
  }

  private emitContact(
    state: FootballAnimationState,
    clipName: string,
    socket: FootballAnimationContactSocket,
  ): void {
    const socketName = socket === 'head' ? 'Head' : socket === 'root' ? 'Armature' : socket;
    const object = this.importedRoot?.getObjectByName(socketName) ?? this.importedRoot ?? this.fallbackRoot;
    const position = object.getWorldPosition(new THREE.Vector3());
    this.contactEvents.push({
      state,
      clipName,
      socket,
      position: { x: position.x, y: position.y, z: position.z },
    });
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
