export interface KickInput {
  charge: number;
  /** Normalized horizontal bend: -1 curves left, +1 curves right. */
  curve: number;
}

const FULL_CURVE_MOUSE_PIXELS = 140;
const CURVE_DEADZONE = 0.12;

export class InputController {
  static readonly maxKickChargeSeconds = 1.1;

  private readonly keys = new Set<string>();
  private mouseDx = 0;
  private mouseDy = 0;
  private kickStartedAt: number | null = null;
  private kickReleaseQueued: KickInput | null = null;
  private kickCurvePixels = 0;
  private recallHeld = false;
  private restartQueued = false;
  private dashQueued = false;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.clearHeldInput);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    target.addEventListener('contextmenu', this.preventContextMenu);
  }

  get isLocked(): boolean {
    return document.pointerLockElement === this.target;
  }

  requestPointerLock(): void {
    void this.target.requestPointerLock().catch(() => {
      // Some automated and embedded browsers deny pointer lock. The player can
      // click the canvas again in a normal browser without breaking the run.
    });
  }

  movement(yaw: number): { x: number; z: number; dash: boolean } {
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const movement = {
      x: -Math.sin(yaw) * forward + Math.cos(yaw) * strafe,
      z: -Math.cos(yaw) * forward - Math.sin(yaw) * strafe,
      dash: this.dashQueued,
    };
    this.dashQueued = false;
    return movement;
  }

  consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDx, y: this.mouseDy };
    this.mouseDx = 0;
    this.mouseDy = 0;
    return delta;
  }

  get kickCharge(): number {
    if (this.kickStartedAt === null) return 0;
    return Math.min(1, (performance.now() - this.kickStartedAt) / (InputController.maxKickChargeSeconds * 1000));
  }

  consumeKick(): KickInput | null {
    const queued = this.kickReleaseQueued;
    this.kickReleaseQueued = null;
    return queued;
  }

  get recall(): boolean {
    return this.recallHeld || this.keys.has('KeyE');
  }

  consumeRestart(): boolean {
    const queued = this.restartQueued;
    this.restartQueued = false;
    return queued;
  }

  dispose(): void {
    this.clearHeldInput();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.clearHeldInput);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.target.removeEventListener('contextmenu', this.preventContextMenu);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (event.code === 'KeyR') this.restartQueued = true;
    if (event.code === 'Space' && this.isLocked) {
      event.preventDefault();
      if (!event.repeat) this.dashQueued = true;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.isLocked) return;
    this.mouseDx += event.movementX;
    this.mouseDy += event.movementY;
    if (this.kickStartedAt !== null) {
      this.kickCurvePixels = Math.max(
        -FULL_CURVE_MOUSE_PIXELS,
        Math.min(FULL_CURVE_MOUSE_PIXELS, this.kickCurvePixels + event.movementX),
      );
    }
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (!this.isLocked) return;
    if (event.button === 0 && this.kickStartedAt === null) {
      this.kickStartedAt = performance.now();
      this.kickCurvePixels = 0;
    }
    if (event.button === 2) this.recallHeld = true;
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0 && this.kickStartedAt !== null) {
      const heldSeconds = (performance.now() - this.kickStartedAt) / 1000;
      this.kickReleaseQueued = {
        charge: Math.min(1, Math.max(0, heldSeconds / InputController.maxKickChargeSeconds)),
        curve: normalizeKickCurveIntent(this.kickCurvePixels),
      };
      this.kickStartedAt = null;
      this.kickCurvePixels = 0;
    }
    if (event.button === 2) this.recallHeld = false;
  };

  private readonly clearHeldInput = (): void => {
    this.keys.clear();
    this.recallHeld = false;
    this.kickStartedAt = null;
    this.kickReleaseQueued = null;
    this.kickCurvePixels = 0;
    this.dashQueued = false;
    this.mouseDx = 0;
    this.mouseDy = 0;
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.clearHeldInput();
  };

  private readonly onPointerLockChange = (): void => {
    if (!this.isLocked) this.clearHeldInput();
  };

  private readonly preventContextMenu = (event: Event): void => event.preventDefault();
}

/** Pure normalization shared with tests and alternate input adapters. */
export function normalizeKickCurveIntent(horizontalPixels: number): number {
  if (!Number.isFinite(horizontalPixels)) return 0;
  const bounded = Math.max(-1, Math.min(1, horizontalPixels / FULL_CURVE_MOUSE_PIXELS));
  const magnitude = Math.abs(bounded);
  if (magnitude <= CURVE_DEADZONE) return 0;
  return Math.sign(bounded) * (magnitude - CURVE_DEADZONE) / (1 - CURVE_DEADZONE);
}
