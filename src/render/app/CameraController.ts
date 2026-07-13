import * as THREE from 'three';
import type { Vec3 } from '../../game/simulation/types';

export class CameraController {
  readonly camera = new THREE.PerspectiveCamera(64, 1, 0.08, 180);
  yaw = Math.PI;
  pitch = 0.32;
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();

  applyMouseDelta(dx: number, dy: number): void {
    this.yaw -= dx * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0018, -0.08, 0.82);
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
    const smoothing = 1 - Math.exp(-12 * dt);
    this.camera.position.lerp(this.desired, smoothing);
    this.camera.lookAt(this.target);
  }

  aimDirection(): Vec3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = THREE.MathUtils.clamp(direction.y, -0.08, 0.2);
    direction.normalize();
    return { x: direction.x, y: direction.y, z: direction.z };
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}
