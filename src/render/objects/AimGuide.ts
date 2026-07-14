import * as THREE from 'three';
import { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import type { Vec3 } from '../../game/simulation/types';

const MAX_AIM_DISTANCE = 120;

/** World-space aiming lane projected over the grass instead of a screen reticle. */
export class AimGuide {
  private readonly mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private readonly direction = new THREE.Vector3();
  private readonly xAxis = new THREE.Vector3(1, 0, 0);
  private disposed = false;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.025, 0.075),
      new THREE.MeshBasicMaterial({
        color: 0xff214f,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    );
    this.mesh.name = 'player-aim-guide';
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  sync(origin: Readonly<Vec3>, aim: Readonly<Vec3>, visible: boolean): void {
    if (this.disposed) return;
    const horizontalLength = Math.hypot(aim.x, aim.z);
    if (!visible || horizontalLength < 0.0001) {
      this.mesh.visible = false;
      return;
    }
    const dx = aim.x / horizontalLength;
    const dz = aim.z / horizontalLength;
    const length = calculateAimGuideLength(origin, { x: dx, y: 0, z: dz });
    if (length <= 0) {
      this.mesh.visible = false;
      return;
    }
    this.direction.set(dx, 0, dz);
    this.mesh.position.set(origin.x + dx * length * 0.5, 0.055, origin.z + dz * length * 0.5);
    this.mesh.quaternion.setFromUnitVectors(this.xAxis, this.direction);
    this.mesh.scale.set(length, 1, 1);
    this.mesh.visible = true;
  }

  reset(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.disposed = true;
  }
}

export function calculateAimGuideLength(origin: Readonly<Vec3>, direction: Readonly<Vec3>): number {
  let nearest = Number.POSITIVE_INFINITY;
  if (direction.x > 0.0001) nearest = Math.min(nearest, (PITCH_HALF_WIDTH - origin.x) / direction.x);
  else if (direction.x < -0.0001) nearest = Math.min(nearest, (-PITCH_HALF_WIDTH - origin.x) / direction.x);
  if (direction.z > 0.0001) nearest = Math.min(nearest, (PITCH_HALF_LENGTH - origin.z) / direction.z);
  else if (direction.z < -0.0001) nearest = Math.min(nearest, (-PITCH_HALF_LENGTH - origin.z) / direction.z);
  return Number.isFinite(nearest) && nearest > 0 ? Math.min(MAX_AIM_DISTANCE, nearest) : 0;
}
