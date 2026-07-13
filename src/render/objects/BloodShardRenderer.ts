import * as THREE from 'three';
import type { PickupSystemState } from '../../game/pickups';

export class BloodShardRenderer {
  private readonly geometry = new THREE.OctahedronGeometry(0.13, 0);
  private readonly material = new THREE.MeshStandardMaterial({
    color: 0xd62d58,
    emissive: 0x7d0a2d,
    emissiveIntensity: 1.4,
    roughness: 0.3,
  });
  private readonly mesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1.45, 1);
  private readonly euler = new THREE.Euler();

  constructor(scene: THREE.Scene, capacity = 160) {
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  sync(state: Readonly<PickupSystemState>, alpha: number): void {
    let visible = 0;
    const t = THREE.MathUtils.clamp(alpha, 0, 1);
    for (const pickup of state.pickups) {
      if (!pickup.active || visible >= this.mesh.instanceMatrix.count) continue;
      this.position.set(
        THREE.MathUtils.lerp(pickup.previousPosition.x, pickup.position.x, t),
        THREE.MathUtils.lerp(pickup.previousPosition.y, pickup.position.y, t),
        THREE.MathUtils.lerp(pickup.previousPosition.z, pickup.position.z, t),
      );
      this.euler.set(0, pickup.spin, pickup.spin * 0.45);
      this.rotation.setFromEuler(this.euler);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(visible, this.matrix);
      visible += 1;
    }
    this.mesh.count = visible;
    if (visible > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  reset(): void {
    this.mesh.count = 0;
  }
  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
