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
  private focusKickQueued = false;
  private gamepadMoveX = 0;
  private gamepadMoveZ = 0;
  private gamepadRecallHeld = false;
  private gamepadLookSensitivity = 1;
  private gamepadVibration = true;
  private activeGamepad: Gamepad | null = null;
  private readonly previousGamepadButtons = new Array<boolean>(18).fill(false);
  private keyBindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };

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

  setKeyBindings(bindings: Readonly<KeyBindings>): void {
    this.clearHeldInput();
    this.keyBindings = { ...bindings };
  }

  setGamepadSettings(lookSensitivity: number, vibration: boolean): void {
    this.gamepadLookSensitivity = Number.isFinite(lookSensitivity)
      ? Math.max(0.4, Math.min(2.5, lookSensitivity))
      : 1;
    this.gamepadVibration = vibration;
  }

  movement(yaw: number): { x: number; z: number; dash: boolean } {
    const keyboardForward =
      Number(this.keys.has(this.keyBindings.moveForward)) -
      Number(this.keys.has(this.keyBindings.moveBackward));
    const keyboardStrafe =
      Number(this.keys.has(this.keyBindings.moveRight)) - Number(this.keys.has(this.keyBindings.moveLeft));
    const forward = Math.max(-1, Math.min(1, keyboardForward - this.gamepadMoveZ));
    const strafe = Math.max(-1, Math.min(1, keyboardStrafe + this.gamepadMoveX));
    const movement = {
      x: -Math.sin(yaw) * forward + Math.cos(yaw) * strafe,
      z: -Math.cos(yaw) * forward - Math.sin(yaw) * strafe,
      dash: this.dashQueued,
    };
    this.dashQueued = false;
    return movement;
  }

  consumeMouseDelta(): { x: number; y: number } {
    this.pollGamepad();
    const delta = { x: this.mouseDx, y: this.mouseDy };
    this.mouseDx = 0;
    this.mouseDy = 0;
    return delta;
  }

  get kickCharge(): number {
    if (this.kickStartedAt === null) return 0;
    return Math.min(
      1,
      (performance.now() - this.kickStartedAt) / (InputController.maxKickChargeSeconds * 1000),
    );
  }

  consumeKick(): KickInput | null {
    const queued = this.kickReleaseQueued;
    this.kickReleaseQueued = null;
    return queued;
  }

  get recall(): boolean {
    return this.recallHeld || this.gamepadRecallHeld || this.keys.has(this.keyBindings.recall);
  }

  consumeRestart(): boolean {
    const queued = this.restartQueued;
    this.restartQueued = false;
    return queued;
  }

  consumeFocusKick(): boolean {
    const queued = this.focusKickQueued;
    this.focusKickQueued = false;
    return queued;
  }

  rumble(strength = 0.5, durationMs = 90): void {
    if (!this.gamepadVibration) return;
    const actuator = this.activeGamepad?.vibrationActuator;
    if (!actuator) return;
    void actuator
      .playEffect('dual-rumble', {
        duration: Math.max(20, Math.min(500, durationMs)),
        strongMagnitude: Math.max(0, Math.min(1, strength)),
        weakMagnitude: Math.max(0, Math.min(1, strength * 0.65)),
      })
      .catch(() => undefined);
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
    if (event.code === this.keyBindings.restart) this.restartQueued = true;
    if (event.code === this.keyBindings.focusKick && this.isLocked && !event.repeat)
      this.focusKickQueued = true;
    if (event.code === this.keyBindings.dash && this.isLocked) {
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
    this.focusKickQueued = false;
    this.gamepadMoveX = 0;
    this.gamepadMoveZ = 0;
    this.gamepadRecallHeld = false;
    this.previousGamepadButtons.fill(false);
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

  private pollGamepad(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const gamepad =
      [...pads].find((candidate): candidate is Gamepad => Boolean(candidate?.connected)) ?? null;
    this.activeGamepad = gamepad;
    if (!gamepad) {
      this.gamepadMoveX = 0;
      this.gamepadMoveZ = 0;
      this.gamepadRecallHeld = false;
      this.previousGamepadButtons.fill(false);
      return;
    }

    this.gamepadMoveX = applyStickDeadzone(gamepad.axes[0] ?? 0);
    this.gamepadMoveZ = applyStickDeadzone(gamepad.axes[1] ?? 0);
    this.mouseDx += applyStickDeadzone(gamepad.axes[2] ?? 0) * 13 * this.gamepadLookSensitivity;
    this.mouseDy += applyStickDeadzone(gamepad.axes[3] ?? 0) * 13 * this.gamepadLookSensitivity;

    const dashPressed = buttonPressed(gamepad, 0);
    const focusPressed = buttonPressed(gamepad, 3);
    const restartPressed = buttonPressed(gamepad, 9);
    if (dashPressed && !this.previousGamepadButtons[0]) this.dashQueued = true;
    if (focusPressed && !this.previousGamepadButtons[3]) this.focusKickQueued = true;
    if (restartPressed && !this.previousGamepadButtons[9]) this.restartQueued = true;
    this.gamepadRecallHeld = buttonValue(gamepad, 6) > 0.28;

    const kickPressed = buttonValue(gamepad, 7) > 0.22;
    if (kickPressed && !this.previousGamepadButtons[7] && this.kickStartedAt === null) {
      this.kickStartedAt = performance.now();
      this.kickCurvePixels = 0;
    } else if (!kickPressed && this.previousGamepadButtons[7] && this.kickStartedAt !== null) {
      const heldSeconds = (performance.now() - this.kickStartedAt) / 1000;
      const curve = buttonValue(gamepad, 5) - buttonValue(gamepad, 4);
      this.kickReleaseQueued = {
        charge: Math.min(1, Math.max(0, heldSeconds / InputController.maxKickChargeSeconds)),
        curve: Math.abs(curve) < 0.12 ? 0 : Math.max(-1, Math.min(1, curve)),
      };
      this.kickStartedAt = null;
    }

    for (let index = 0; index < this.previousGamepadButtons.length; index += 1) {
      this.previousGamepadButtons[index] = buttonPressed(gamepad, index);
    }
  }
}

/** Pure normalization shared with tests and alternate input adapters. */
export function normalizeKickCurveIntent(horizontalPixels: number): number {
  if (!Number.isFinite(horizontalPixels)) return 0;
  const bounded = Math.max(-1, Math.min(1, horizontalPixels / FULL_CURVE_MOUSE_PIXELS));
  const magnitude = Math.abs(bounded);
  if (magnitude <= CURVE_DEADZONE) return 0;
  return (Math.sign(bounded) * (magnitude - CURVE_DEADZONE)) / (1 - CURVE_DEADZONE);
}

export function applyStickDeadzone(value: number, deadzone = 0.16): number {
  if (!Number.isFinite(value)) return 0;
  const bounded = Math.max(-1, Math.min(1, value));
  const magnitude = Math.abs(bounded);
  if (magnitude <= deadzone) return 0;
  return (Math.sign(bounded) * (magnitude - deadzone)) / (1 - deadzone);
}

function buttonPressed(gamepad: Gamepad, index: number): boolean {
  return gamepad.buttons[index]?.pressed ?? false;
}

function buttonValue(gamepad: Gamepad, index: number): number {
  return gamepad.buttons[index]?.value ?? 0;
}
import { DEFAULT_KEY_BINDINGS, type KeyBindings } from '../../settings/SettingsStore';
