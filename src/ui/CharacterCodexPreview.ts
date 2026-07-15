import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CharacterId } from '../game/characters';
import {
  createImportedCharacterVariantController,
  type ImportedCharacterVariantController,
} from '../render/objects/PlayerCharacterVariants';
import {
  resolveFootballAnimationContract,
  type FootballAnimationState,
} from '../render/objects/FootballAnimationContract';
import { createWebAuthoredFootballClips } from '../render/objects/WebAuthoredFootballClips';

const CHARACTER_URL = '/assets/vendor/quaternius/night-striker.glb';
const ANIMATION_URL = '/assets/vendor/quaternius/universal-animation-library.glb';

export const CODEX_PREVIEW_STATES = Object.freeze([
  'idle',
  'dribble',
  'shoot',
  'slideTackle',
  'victory',
] satisfies readonly FootballAnimationState[]);

export type CodexPreviewState = (typeof CODEX_PREVIEW_STATES)[number];

export function isCodexPreviewState(value: unknown): value is CodexPreviewState {
  return typeof value === 'string' && CODEX_PREVIEW_STATES.includes(value as CodexPreviewState);
}

/** Lightweight, on-demand WebGL viewer for the Career Codex character section. */
export class CharacterCodexPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  private readonly stage = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver?: ResizeObserver;
  private model?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private variants?: ImportedCharacterVariantController;
  private readonly actions = new Map<CodexPreviewState, THREE.AnimationAction>();
  private activeAction?: THREE.AnimationAction;
  private selectedCharacter: CharacterId = 'maestro';
  private active = false;
  private disposed = false;
  private frame = 0;

  public constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.className = 'codex-character-preview__canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Animated 3D character preview');
    this.host.prepend(this.renderer.domElement);

    this.camera.position.set(0, 1.28, 4.6);
    this.camera.lookAt(0, 1.05, 0);
    this.scene.add(this.stage);
    this.scene.add(new THREE.HemisphereLight(0xdde8ff, 0x170c20, 2.35));
    const key = new THREE.DirectionalLight(0xffd6bd, 4.2);
    key.position.set(2.8, 4.5, 3.4);
    const rim = new THREE.DirectionalLight(0xc72f62, 3.6);
    rim.position.set(-3.4, 2.7, -2.6);
    this.scene.add(key, rim);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 1.05, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x231424, roughness: 0.45, metalness: 0.32 }),
    );
    platform.name = 'codex-preview-platform';
    platform.position.y = -0.06;
    this.stage.add(platform);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host);
    }
    this.resize();
    void this.load();
  }

  public setActive(active: boolean): void {
    if (this.disposed || this.active === active) return;
    this.active = active;
    this.clock.getDelta();
    if (active) this.frame = window.requestAnimationFrame(this.render);
    else window.cancelAnimationFrame(this.frame);
  }

  public setCharacter(id: CharacterId): void {
    this.selectedCharacter = id;
    this.variants?.apply(id);
    this.stage.userData.previewCharacter = id;
  }

  public play(state: CodexPreviewState): boolean {
    const next = this.actions.get(state);
    if (!next) return false;
    if (this.activeAction !== next) this.activeAction?.fadeOut(0.12);
    next.reset().fadeIn(0.12).play();
    this.activeAction = next;
    this.stage.userData.previewAnimation = state;
    return true;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.setActive(false);
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.variants?.dispose();
    this.mixer?.stopAllAction();
    this.actions.clear();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private async load(): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const [character, library] = await Promise.all([
        loader.loadAsync(CHARACTER_URL),
        loader.loadAsync(ANIMATION_URL),
      ]);
      if (this.disposed) {
        disposeObject(character.scene);
        disposeObject(library.scene);
        return;
      }
      this.model = character.scene;
      this.model.name = 'codex-preview-character';
      this.model.rotation.y = Math.PI;
      this.model.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = false;
          node.receiveShadow = false;
          node.frustumCulled = false;
        }
      });
      this.stage.add(this.model);
      this.variants = createImportedCharacterVariantController(this.model);
      this.variants.apply(this.selectedCharacter);
      this.mixer = new THREE.AnimationMixer(this.model);
      const clips = new Map(library.animations.map((clip) => [clip.name, clip]));
      for (const clip of createWebAuthoredFootballClips(this.model)) clips.set(clip.name, clip);
      const contract = resolveFootballAnimationContract(clips.keys());
      for (const state of CODEX_PREVIEW_STATES) {
        const resolution = contract.get(state);
        const clip = resolution?.clipName ? clips.get(resolution.clipName) : undefined;
        if (!clip) continue;
        const action = this.mixer.clipAction(clip);
        if (resolution?.playback !== 'loop') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions.set(state, action);
      }
      disposeObject(library.scene);
      this.host.classList.add('codex-character-preview--ready');
      this.play('idle');
    } catch (error: unknown) {
      this.host.classList.add('codex-character-preview--fallback');
      console.warn('Codex character preview unavailable.', error);
    }
  }

  private readonly render = (): void => {
    if (!this.active || this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.mixer?.update(dt);
    this.stage.rotation.y = Math.sin(performance.now() * 0.00032) * 0.16;
    this.renderer.render(this.scene, this.camera);
    this.frame = window.requestAnimationFrame(this.render);
  };

  private resize(): void {
    const width = Math.max(240, this.host.clientWidth || 420);
    const height = Math.max(240, Math.min(430, this.host.clientHeight || 360));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

function disposeObject(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  });
  for (const texture of textures) texture.dispose();
}
