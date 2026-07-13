import * as THREE from 'three';
import type { Vec3 } from '../../game/simulation/types';

const CAMERA_ARENA_HALF_WIDTH = 22.45;
const CAMERA_ARENA_HALF_DEPTH = 14.45;

export class CameraController {
  readonly camera = new THREE.PerspectiveCamera(64, 1, 0.08, 180);
  yaw = Math.PI;
  pitch = 0.32;
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private trauma = 0;
  private impulseTime = 0;
  private fovKick = 0;
  private sensitivity = 1;
  private shakeScale = 1;

  setSensitivity(value: number): void {
    this.sensitivity = Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0.25, 2.5) : 1;
  }

  setReducedShake(reduced: boolean): void {
    this.shakeScale = reduced ? 0.28 : 1;
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
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0018 * this.sensitivity, -0.08, 0.82);
  }

  update(player: Vec3, dt: number): void {
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
    this.desired.x = THREE.MathUtils.clamp(
      this.desired.x,
      -CAMERA_ARENA_HALF_WIDTH,
      CAMERA_ARENA_HALF_WIDTH,
    );
    this.desired.z = THREE.MathUtils.clamp(
      this.desired.z,
      -CAMERA_ARENA_HALF_DEPTH,
      CAMERA_ARENA_HALF_DEPTH,
    );
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
