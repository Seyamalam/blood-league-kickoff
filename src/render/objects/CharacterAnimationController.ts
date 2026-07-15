import * as THREE from 'three';
import type { AnimationActionLoopStyles } from 'three';

export interface BaseAnimationRequest {
  readonly name: string;
  readonly priority: number;
  readonly fade?: number;
  readonly loop?: AnimationActionLoopStyles;
  /**
   * Presentation lock used when a mixer `finished` event is missed or when
   * locomotion should recover before the final authored settling frames.
   */
  readonly releaseAfter?: number;
  readonly terminal?: boolean;
  readonly forceRestart?: boolean;
  /** Normalized authored contact marker. Presentation-only; never gates gameplay. */
  readonly contactAt?: number;
  readonly onContact?: () => void;
}

export interface AdditiveOverlayRequest {
  readonly name: string;
  readonly fade?: number;
  readonly weight?: number;
}

interface ActiveBaseAnimation {
  readonly action: THREE.AnimationAction;
  readonly name: string;
  readonly priority: number;
  readonly terminal: boolean;
  remaining: number;
  elapsed: number;
  readonly contactTime?: number;
  contactEmitted: boolean;
  readonly onContact?: () => void;
}

/**
 * Render-only animation arbitration for the shared character rig.
 *
 * Gameplay never waits on this controller. Priorities only prevent a low-value
 * locomotion crossfade from visually cancelling a technique, reaction, or
 * terminal pose. One-shots release on the mixer's completion event and also
 * have a deterministic presentation-time fallback.
 */
export class CharacterAnimationController {
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private readonly additiveClips = new Map<string, THREE.AnimationClip>();
  private activeBase?: ActiveBaseAnimation;
  private readonly activeOverlays = new Set<THREE.AnimationAction>();
  private releasedSinceLastUpdate = false;

  constructor(
    private readonly mixer: THREE.AnimationMixer,
    clips: Iterable<THREE.AnimationClip>,
  ) {
    for (const clip of clips) {
      this.clips.set(clip.name, clip);
      if (isExplicitAdditiveClipName(clip.name)) {
        const additive = clip.clone();
        THREE.AnimationUtils.makeClipAdditive(additive);
        this.additiveClips.set(clip.name, additive);
      }
    }
    this.mixer.addEventListener('finished', this.handleFinished);
  }

  get isBaseLocked(): boolean {
    return (
      this.activeBase !== undefined &&
      (this.activeBase.terminal || Number.isFinite(this.activeBase.remaining))
    );
  }

  get activeBaseName(): string | undefined {
    return this.activeBase?.name;
  }

  playBase(request: BaseAnimationRequest): boolean {
    const clip = this.clips.get(request.name);
    if (!clip) return false;

    const current = this.activeBase;
    if (current?.terminal) return false;
    if (current && this.isBaseLocked && request.priority < current.priority) return false;
    if (current?.name === request.name && !request.forceRestart) return true;

    const fade = Math.max(0, request.fade ?? 0.16);
    const loop = request.loop ?? THREE.LoopRepeat;
    const next = this.mixer.clipAction(clip);
    const restartingCurrent = current?.action === next;
    if (restartingCurrent) next.stop();
    next.enabled = true;
    next.reset();
    next.setEffectiveWeight(1);
    next.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
    next.clampWhenFinished = loop === THREE.LoopOnce;
    next.fadeIn(fade).play();
    if (current && !restartingCurrent) current.action.fadeOut(fade);

    const oneShot = loop === THREE.LoopOnce;
    this.activeBase = {
      action: next,
      name: request.name,
      priority: request.priority,
      terminal: request.terminal ?? false,
      remaining: oneShot
        ? Math.max(0.05, request.releaseAfter ?? clip.duration + fade)
        : Number.POSITIVE_INFINITY,
      elapsed: 0,
      contactTime:
        request.contactAt === undefined
          ? undefined
          : clip.duration * THREE.MathUtils.clamp(request.contactAt, 0, 1),
      contactEmitted: false,
      onContact: request.onContact,
    };
    this.releasedSinceLastUpdate = false;
    return true;
  }

  /**
   * Plays only explicitly named additive exports (`Additive_*` or
   * `*_Additive`). Arbitrary full-body clips are rejected so they cannot bend
   * the character twice or corrupt locomotion.
   */
  playAdditiveOverlay(request: AdditiveOverlayRequest): boolean {
    const clip = this.additiveClips.get(request.name);
    if (!clip) return false;
    const fade = Math.max(0, request.fade ?? 0.06);
    const action = this.mixer.clipAction(clip);
    action.stop();
    action.enabled = true;
    action.reset();
    action.setEffectiveWeight(THREE.MathUtils.clamp(request.weight ?? 1, 0, 1));
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = false;
    action.fadeIn(fade).play();
    this.activeOverlays.add(action);
    return true;
  }

  /** Advances presentation and reports whether a one-shot released this frame. */
  update(dt: number): boolean {
    const active = this.activeBase;
    const step = Math.max(0, dt);
    if (active) {
      active.elapsed += step;
      if (
        !active.contactEmitted &&
        active.contactTime !== undefined &&
        active.elapsed >= active.contactTime
      ) {
        active.contactEmitted = true;
        active.onContact?.();
      }
    }
    if (active && !active.terminal && Number.isFinite(active.remaining)) {
      active.remaining = Math.max(0, active.remaining - step);
      if (active.remaining === 0) this.releaseBase(active.action);
    }
    this.mixer.update(step);
    const released = this.releasedSinceLastUpdate;
    this.releasedSinceLastUpdate = false;
    return released;
  }

  reset(): void {
    this.mixer.stopAllAction();
    this.activeBase = undefined;
    this.activeOverlays.clear();
    this.releasedSinceLastUpdate = false;
  }

  dispose(): void {
    this.mixer.removeEventListener('finished', this.handleFinished);
    this.reset();
    this.clips.clear();
    this.additiveClips.clear();
  }

  private readonly handleFinished = (event: { action: THREE.AnimationAction }): void => {
    if (this.activeBase?.action === event.action && !this.activeBase.terminal) {
      this.releaseBase(event.action);
    }
    this.activeOverlays.delete(event.action);
  };

  private releaseBase(action: THREE.AnimationAction): void {
    if (this.activeBase?.action !== action) return;
    this.activeBase = undefined;
    this.releasedSinceLastUpdate = true;
  }
}

export function isExplicitAdditiveClipName(name: string): boolean {
  return /^Additive_/i.test(name) || /_Additive$/i.test(name);
}
