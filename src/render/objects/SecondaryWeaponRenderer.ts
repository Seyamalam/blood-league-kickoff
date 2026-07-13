import * as THREE from 'three';
import type { SecondaryWeaponRenderState } from '../../game/combat';

export class SecondaryWeaponRenderer {
  private readonly garlic: THREE.Mesh[];
  private readonly orbits: THREE.Mesh[];
  private readonly ghosts: THREE.Mesh[];
  private readonly multiBalls: THREE.Mesh[];
  private readonly blackHoles: THREE.Mesh[];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    const garlicGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.8, 0.8, 0.035, 16));
    const orbGeometry = this.trackGeometry(new THREE.SphereGeometry(0.32, 10, 8));
    const garlicMaterial = this.trackMaterial(
      new THREE.MeshBasicMaterial({ color: 0x7fe0a2, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    const orbitMaterial = this.trackMaterial(
      new THREE.MeshStandardMaterial({ color: 0xd8f5ff, emissive: 0x548bb5, emissiveIntensity: 1.7 }),
    );
    const ghostMaterial = this.trackMaterial(
      new THREE.MeshBasicMaterial({ color: 0xa7dfff, transparent: true, opacity: 0.65, depthWrite: false }),
    );
    const multiBallMaterial = this.trackMaterial(
      new THREE.MeshBasicMaterial({ color: 0xd7b7ff, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    const blackHoleGeometry = this.trackGeometry(new THREE.TorusGeometry(0.32, 0.1, 8, 20));
    const blackHoleMaterial = this.trackMaterial(
      new THREE.MeshBasicMaterial({ color: 0x8b43c7, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    this.garlic = Array.from({ length: 24 }, () => this.add(scene, garlicGeometry, garlicMaterial));
    this.orbits = Array.from({ length: 3 }, () => this.add(scene, orbGeometry, orbitMaterial));
    this.ghosts = Array.from({ length: 8 }, () => this.add(scene, orbGeometry, ghostMaterial));
    this.multiBalls = Array.from({ length: 6 }, () => this.add(scene, orbGeometry, multiBallMaterial));
    this.blackHoles = Array.from({ length: 4 }, () => this.add(scene, blackHoleGeometry, blackHoleMaterial));
  }

  sync(state: SecondaryWeaponRenderState): void {
    this.syncPool(this.garlic, state.garlicZones);
    this.syncPool(this.orbits, state.orbitingBalls);
    this.syncPool(this.ghosts, state.ghostPasses);
    this.syncPool(this.multiBalls, state.multiBallShots);
    this.syncPool(this.blackHoles, state.blackHoleZones);
    for (let index = 0; index < this.blackHoles.length; index += 1) {
      const mesh = this.blackHoles[index]!;
      if (!mesh.visible) continue;
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z += 0.035 + index * 0.002;
    }
  }

  reset(): void {
    for (const mesh of [
      ...this.garlic,
      ...this.orbits,
      ...this.ghosts,
      ...this.multiBalls,
      ...this.blackHoles,
    ])
      mesh.visible = false;
  }
  dispose(): void {
    for (const mesh of [
      ...this.garlic,
      ...this.orbits,
      ...this.ghosts,
      ...this.multiBalls,
      ...this.blackHoles,
    ])
      mesh.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }

  private syncPool(
    pool: THREE.Mesh[],
    states: readonly { active: boolean; position: { x: number; y: number; z: number }; radius: number }[],
  ): void {
    for (let index = 0; index < pool.length; index += 1) {
      const mesh = pool[index]!;
      const state = states[index];
      mesh.visible = state?.active ?? false;
      if (!state?.active) continue;
      mesh.position.set(state.position.x, Math.max(0.04, state.position.y), state.position.z);
      if (pool !== this.garlic) mesh.scale.setScalar(state.radius / 0.32);
    }
  }

  private add(scene: THREE.Scene, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }
  private trackGeometry<T extends THREE.BufferGeometry>(value: T): T {
    this.geometries.push(value);
    return value;
  }
  private trackMaterial<T extends THREE.Material>(value: T): T {
    this.materials.push(value);
    return value;
  }
}
