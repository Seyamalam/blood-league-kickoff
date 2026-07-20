import * as THREE from 'three';
import type { SecondaryWeaponRenderState } from '../../game/combat';
import { voxelFootballPropGeometry } from './VoxelFootballProps';

const GARLIC_CAPACITY = 24;
const ORBIT_CAPACITY = 3;
const GHOST_CAPACITY = 8;
const MULTI_BALL_CAPACITY = 6;
const BLACK_HOLE_CAPACITY = 4;
const ORB_BASE_RADIUS = 0.32;

type RenderPoolState = readonly {
  active: boolean;
  position: { x: number; y: number; z: number };
  radius: number;
}[];

/** Five draw-call-friendly batches mirror the simulation's fixed secondary-weapon pools. */
export class SecondaryWeaponRenderer {
  private readonly garlic: THREE.InstancedMesh;
  private readonly orbits: THREE.InstancedMesh;
  private readonly ghosts: THREE.InstancedMesh;
  private readonly multiBalls: THREE.InstancedMesh;
  private readonly blackHoles: THREE.InstancedMesh;
  private readonly meshes: readonly THREE.InstancedMesh[];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly euler = new THREE.Euler();
  private disposed = false;

  constructor(scene: THREE.Scene) {
    const garlicGeometry = this.trackGeometry(voxelFootballPropGeometry('cleatedBoot').clone());
    const orbitGeometry = this.trackGeometry(voxelFootballPropGeometry('spectralBall').clone());
    const ghostGeometry = this.trackGeometry(voxelFootballPropGeometry('whistle').clone());
    const multiBallGeometry = this.trackGeometry(voxelFootballPropGeometry('bloodBall').clone());
    const blackHoleGeometry = this.trackGeometry(voxelFootballPropGeometry('goalNet').clone());
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
    const blackHoleMaterial = this.trackMaterial(
      new THREE.MeshBasicMaterial({ color: 0x8b43c7, transparent: true, opacity: 0.7, depthWrite: false }),
    );

    this.garlic = this.add(scene, 'garlic', garlicGeometry, garlicMaterial, GARLIC_CAPACITY);
    this.orbits = this.add(scene, 'orbit', orbitGeometry, orbitMaterial, ORBIT_CAPACITY);
    this.ghosts = this.add(scene, 'ghost-pass', ghostGeometry, ghostMaterial, GHOST_CAPACITY);
    this.multiBalls = this.add(
      scene,
      'multi-ball',
      multiBallGeometry,
      multiBallMaterial,
      MULTI_BALL_CAPACITY,
    );
    this.blackHoles = this.add(
      scene,
      'black-hole',
      blackHoleGeometry,
      blackHoleMaterial,
      BLACK_HOLE_CAPACITY,
    );
    this.meshes = [this.garlic, this.orbits, this.ghosts, this.multiBalls, this.blackHoles];
  }

  sync(state: SecondaryWeaponRenderState): void {
    this.syncPool(this.garlic, state.garlicZones, 0.62, 'ground');
    this.syncPool(this.orbits, state.orbitingBalls, 1 / ORB_BASE_RADIUS, 'spin');
    this.syncPool(this.ghosts, state.ghostPasses, 1.25, 'whistle');
    this.syncPool(this.multiBalls, state.multiBallShots, 1 / ORB_BASE_RADIUS, 'spin');
    this.syncBlackHoles(state.blackHoleZones);
  }

  reset(): void {
    for (const mesh of this.meshes) {
      mesh.count = 0;
      mesh.visible = false;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.meshes) mesh.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }

  private syncPool(
    mesh: THREE.InstancedMesh,
    states: RenderPoolState,
    scaleFactor: number,
    orientation: 'ground' | 'spin' | 'whistle',
  ): void {
    let visible = 0;
    for (let index = 0; index < states.length && visible < mesh.instanceMatrix.count; index += 1) {
      const state = states[index];
      if (!state?.active) continue;
      this.position.set(state.position.x, Math.max(0.04, state.position.y), state.position.z);
      if (orientation === 'ground') this.euler.set(0, index * 0.63, 0);
      else if (orientation === 'whistle') this.euler.set(0, Math.PI / 2 + index * 0.24, -0.18);
      else this.euler.set(index * 0.31, index * 0.57, index * 0.19);
      this.rotation.setFromEuler(this.euler);
      const scale = orientation === 'ground' ? scaleFactor : Math.max(0.38, state.radius * scaleFactor);
      this.scale.setScalar(scale);
      this.matrix.compose(this.position, this.rotation, this.scale);
      mesh.setMatrixAt(visible, this.matrix);
      visible += 1;
    }
    mesh.count = visible;
    mesh.visible = visible > 0;
    if (visible > 0) mesh.instanceMatrix.needsUpdate = true;
  }

  private syncBlackHoles(states: SecondaryWeaponRenderState['blackHoleZones']): void {
    let visible = 0;
    for (let index = 0; index < states.length && visible < this.blackHoles.instanceMatrix.count; index += 1) {
      const state = states[index];
      if (!state?.active) continue;
      this.position.set(state.position.x, Math.max(0.04, state.position.y), state.position.z);
      this.euler.set(0, state.age * (1.35 + index * 0.08), 0);
      this.rotation.setFromEuler(this.euler);
      this.scale.setScalar(Math.max(0.55, state.radius / 1.6));
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.blackHoles.setMatrixAt(visible, this.matrix);
      visible += 1;
    }
    this.blackHoles.count = visible;
    this.blackHoles.visible = visible > 0;
    if (visible > 0) this.blackHoles.instanceMatrix.needsUpdate = true;
  }

  private add(
    scene: THREE.Scene,
    family: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = `secondary-${family}`;
    mesh.userData.secondaryWeaponFamily = family;
    mesh.count = 0;
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
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
