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
import { CHARACTER_SELECTION_PRESENTATIONS } from '../render/objects/VoxelCharacterPresentation';

export const CODEX_PREVIEW_STATES = Object.freeze([
  'idle',
  'dribble',
  'groundPass',
  'lobPass',
  'shoot',
  'header',
  'slideTackle',
  'bicycleKick',
  'celebration',
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
  private turntableAngle = 0;
  private turntableVelocity = 0;
  private autoRotate = true;
  private dragging = false;
  private dragX = 0;

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
    this.animations.setPersonality(this.selectedCharacter);
    this.animations.play(CHARACTER_SELECTION_PRESENTATIONS[this.selectedCharacter].introductionState);
    this.stage.userData.previewCharacter = this.selectedCharacter;
    this.stage.userData.previewAnimation = 'idle';
    this.host.classList.add('codex-character-preview--ready');
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerUp);

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
    this.turntableAngle = 0;
    this.turntableVelocity = 0;
    this.variants.apply(id);
    this.animations.setPersonality(id);
    this.animations.reset();
    this.animations.play(CHARACTER_SELECTION_PRESENTATIONS[id].introductionState);
    this.stage.userData.previewCharacter = id;
    this.stage.userData.previewAnimation = CHARACTER_SELECTION_PRESENTATIONS[id].introductionState;
  }

  public play(state: CodexPreviewState): boolean {
    // Preview controls are direct scrubbing commands, not gameplay arbitration.
    // Reset first so a held victory pose cannot trap the kit-room controls.
    this.animations.reset();
    const played = this.animations.play(state as VoxelAnimationState);
    if (played) this.stage.userData.previewAnimation = state;
    return played;
  }

  public playSignature(): boolean {
    const state = CHARACTER_SELECTION_PRESENTATIONS[this.selectedCharacter].signatureState;
    this.animations.reset();
    const played = this.animations.play(state);
    if (played) this.stage.userData.previewAnimation = state;
    return played;
  }

  public rotate(direction: -1 | 1): void {
    this.autoRotate = false;
    this.turntableVelocity += direction * 1.8;
  }

  public toggleAutoRotate(): boolean {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.setActive(false);
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerUp);
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
    if (this.autoRotate && !this.dragging) this.turntableVelocity += dt * 0.34;
    this.turntableAngle += this.turntableVelocity * dt;
    this.turntableVelocity *= Math.pow(0.08, dt);
    this.stage.rotation.y = this.turntableAngle;
    this.renderer.render(this.scene, this.camera);
    this.frame = window.requestAnimationFrame(this.render);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.autoRotate = false;
    this.dragX = event.clientX;
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    const delta = event.clientX - this.dragX;
    this.dragX = event.clientX;
    this.turntableAngle += delta * 0.012;
    this.turntableVelocity = delta * 0.08;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.dragging = false;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }
  };

  private resize(): void {
    const width = Math.max(240, this.host.clientWidth || 420);
    const height = Math.max(240, Math.min(430, this.host.clientHeight || 360));
    this.stage.position.x = width < 500 ? -0.58 : 0;
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
