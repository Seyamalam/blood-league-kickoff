import * as THREE from 'three';
import type { CharacterId } from '../game/characters';
import {
  VoxelAnimationController,
  type VoxelAnimationState,
} from '../render/objects/VoxelAnimationController';
import { createVoxelHumanoid, type VoxelHumanoid } from '../render/objects/VoxelHumanoid';
import {
  createVoxelPlayerVariantController,
  type VoxelPlayerVariantController,
} from '../render/objects/VoxelPlayerVariants';
import type { FootballAnimationState } from '../render/objects/FootballAnimationContract';

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

/** Lightweight, synchronous WebGL viewer for the original voxel roster. */
export class CharacterCodexPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  private readonly stage = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver?: ResizeObserver;
  private readonly rig: VoxelHumanoid;
  private readonly animations: VoxelAnimationController;
  private readonly variants: VoxelPlayerVariantController;
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
    this.renderer.domElement.setAttribute('aria-label', 'Animated original voxel character preview');
    this.host.prepend(this.renderer.domElement);

    this.camera.position.set(0, 1.18, 5.8);
    this.camera.lookAt(0, 1.18, 0);
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

    this.rig = createVoxelHumanoid({
      namePrefix: 'codex-player',
      castShadow: false,
      accessories: { hair: 'crop', wristbands: true, shinGuards: true },
    });
    this.rig.root.name = 'codex-preview-character';
    this.stage.add(this.rig.root);
    this.variants = createVoxelPlayerVariantController(this.rig);
    this.variants.apply(this.selectedCharacter);
    this.animations = new VoxelAnimationController(this.rig);
    this.animations.play('idle');
    this.stage.userData.previewCharacter = this.selectedCharacter;
    this.stage.userData.previewAnimation = 'idle';
    this.host.classList.add('codex-character-preview--ready');

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host);
    }
    this.resize();
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
    this.variants.apply(id);
    this.stage.userData.previewCharacter = id;
  }

  public play(state: CodexPreviewState): boolean {
    // Preview controls are direct scrubbing commands, not gameplay arbitration.
    // Reset first so a held victory pose cannot trap the kit-room controls.
    this.animations.reset();
    const played = this.animations.play(state as VoxelAnimationState);
    if (played) this.stage.userData.previewAnimation = state;
    return played;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.setActive(false);
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.animations.dispose();
    this.variants.dispose();
    this.rig.dispose();
    this.rig.root.removeFromParent();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly render = (): void => {
    if (!this.active || this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.animations.update(dt);
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
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material.dispose();
  });
}
