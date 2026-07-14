import * as THREE from 'three';
import type { Vec3 } from '../../game/simulation/types';
import type { CombatFeedbackState } from '../../game/combat';
import { ARENA_WALL_HALF_LENGTH, ARENA_WALL_HALF_WIDTH } from '../../game/field';

const CAMERA_ARENA_HALF_WIDTH = ARENA_WALL_HALF_WIDTH - 0.55;
const CAMERA_ARENA_HALF_DEPTH = ARENA_WALL_HALF_LENGTH - 0.55;

export class CameraController {
  readonly camera = new THREE.PerspectiveCamera(64, 1, 0.08, 180);
  yaw = 0;
  pitch = 0.32;
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private trauma = 0;
  private impulseTime = 0;
  private fovKick = 0;
  private sensitivity = 1;
  private invertVerticalLook = false;
  private shakeScale = 1;
  private focusMode = false;
  private photoMode: { yaw: number; pitch: number; distance: number; fov: number } | null = null;

  setFocusMode(active: boolean): void {
    this.focusMode = active;
  }

  setPhotoMode(state: { yaw: number; pitch: number; distance: number; fov: number } | null): void {
    this.photoMode = state
      ? {
          yaw: Number.isFinite(state.yaw) ? state.yaw : 0,
          pitch: THREE.MathUtils.clamp(state.pitch, -1.25, 1.25),
          distance: THREE.MathUtils.clamp(state.distance, 2, 24),
          fov: THREE.MathUtils.clamp(state.fov, 24, 90),
        }
      : null;
  }

  setSensitivity(value: number): void {
    this.sensitivity = Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0.25, 2.5) : 1;
  }

  setInvertVerticalLook(inverted: boolean): void {
    this.invertVerticalLook = inverted;
  }

  setReducedShake(reduced: boolean): void {
    this.shakeScale = reduced ? 0.28 : 1;
  }

  /** Sets presentation shake from fully disabled (0) to authored strength (1). */
  setShakeIntensity(intensity: number): void {
    this.shakeScale = Number.isFinite(intensity) ? THREE.MathUtils.clamp(intensity, 0, 1) : 1;
  }

  /** Adds restrained positional shake. Values in the 0.1–0.35 range work best. */
  addImpulse(strength = 0.16): void {
    const safeStrength = Number.isFinite(strength) ? THREE.MathUtils.clamp(strength, 0, 0.55) : 0;
    this.trauma = Math.min(0.7, this.trauma + safeStrength * this.shakeScale);
  }

  hitImpulse(intensity = 1): void {
    this.addImpulse(0.18 * safeIntensity(intensity));
    this.fovKick = Math.min(1.4, this.fovKick + 0.3 * safeIntensity(intensity));
  }

  volleyImpulse(intensity = 1): void {
    this.addImpulse(0.3 * safeIntensity(intensity));
    this.fovKick = Math.min(2.2, this.fovKick + 1.05 * safeIntensity(intensity));
  }

  applyMouseDelta(dx: number, dy: number): void {
    this.yaw -= dx * 0.0022 * this.sensitivity;
    const verticalDirection = this.invertVerticalLook ? -1 : 1;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + dy * 0.0018 * this.sensitivity * verticalDirection,
      -0.08,
      0.82,
    );
  }

  update(player: Vec3, dt: number): void {
    if (this.photoMode) {
      const horizontal = Math.cos(this.photoMode.pitch) * this.photoMode.distance;
      this.target.set(player.x, player.y + 1.05, player.z);
      this.desired.set(
        player.x + Math.sin(this.photoMode.yaw) * horizontal,
        player.y + 1.05 + Math.sin(this.photoMode.pitch) * this.photoMode.distance,
        player.z + Math.cos(this.photoMode.yaw) * horizontal,
      );
      this.camera.position.lerp(this.desired, 1 - Math.exp(-18 * dt));
      this.camera.lookAt(this.target);
      if (Math.abs(this.camera.fov - this.photoMode.fov) > 0.01) {
        this.camera.fov = this.photoMode.fov;
        this.camera.updateProjectionMatrix();
      }
      return;
    }
    if (this.focusMode) {
      const forwardX = -Math.sin(this.yaw) * Math.cos(this.pitch);
      const forwardZ = -Math.cos(this.yaw) * Math.cos(this.pitch);
      this.desired.set(player.x, player.y + 1.22, player.z);
      this.target.set(
        player.x + forwardX * 14,
        player.y + 1.22 - Math.sin(this.pitch) * 14,
        player.z + forwardZ * 14,
      );
      this.camera.position.lerp(this.desired, 1 - Math.exp(-24 * dt));
      this.camera.lookAt(this.target);
      this.fovKick *= Math.exp(-11 * dt);
      const focusFov = 52 + this.fovKick;
      if (Math.abs(this.camera.fov - focusFov) > 0.01) {
        this.camera.fov = focusFov;
        this.camera.updateProjectionMatrix();
      }
      return;
    }
    const distance = 7.5;
    const horizontal = Math.cos(this.pitch) * distance;
    this.target.set(player.x, player.y + 1.05, player.z);
    this.desired.set(
      player.x + Math.sin(this.yaw) * horizontal,
      player.y + 1.1 + Math.sin(this.pitch) * distance,
      player.z + Math.cos(this.yaw) * horizontal,
    );
    // Keep the orbit rig on the playable side of the collision walls. This is
    // deliberately deterministic and cheaper than a per-frame scene raycast;
    // it prevents the common boundary case where the camera clips outside the
    // stadium while the player hugs a touchline or goal line.
    this.desired.x = THREE.MathUtils.clamp(this.desired.x, -CAMERA_ARENA_HALF_WIDTH, CAMERA_ARENA_HALF_WIDTH);
    this.desired.z = THREE.MathUtils.clamp(this.desired.z, -CAMERA_ARENA_HALF_DEPTH, CAMERA_ARENA_HALF_DEPTH);
    this.impulseTime += dt;
    this.trauma = Math.max(0, this.trauma - dt * 2.6);
    const shake = this.trauma * this.trauma;
    const smoothing = 1 - Math.exp(-12 * dt);
    this.camera.position.lerp(this.desired, smoothing);
    this.camera.position.x += Math.sin(this.impulseTime * 67) * shake * 0.38;
    this.camera.position.y += Math.sin(this.impulseTime * 83 + 1.7) * shake * 0.22;
    this.camera.position.z += Math.sin(this.impulseTime * 59 + 3.1) * shake * 0.38;
    this.camera.lookAt(this.target);
    this.fovKick *= Math.exp(-11 * dt);
    const nextFov = 64 + this.fovKick;
    if (Math.abs(this.camera.fov - nextFov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Applies one presentation-only combat impulse after the follow rig updates. */
  applyCombatFeedback(feedback: Readonly<CombatFeedbackState>): void {
    this.camera.position.x += feedback.cameraOffset.x;
    this.camera.position.y += feedback.cameraOffset.y;
    this.camera.position.z += feedback.cameraOffset.z;
    this.camera.rotateZ(feedback.cameraRoll);
    if (feedback.fovKick > 0.01) {
      this.camera.fov += feedback.fovKick;
      this.camera.updateProjectionMatrix();
    }
  }

  aimDirection(): Vec3 {
    this.camera.getWorldDirection(this.aim);
    this.aim.y = THREE.MathUtils.clamp(this.aim.y, -0.08, 0.2);
    this.aim.normalize();
    return { x: this.aim.x, y: this.aim.y, z: this.aim.z };
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}

function safeIntensity(value: number): number {
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 2) : 1;
}
