import * as THREE from 'three';

const OPPONENT_GOAL_Z = -14.4;

/** Lightweight world-space marker for the limited goal-scoring window. */
export class GoalBeacon {
  private readonly group = new THREE.Group();
  private readonly goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9a62e,
    emissive: 0x6f3200,
    emissiveIntensity: 0.7,
    roughness: 0.32,
    metalness: 0.48,
  });
  private readonly crimsonMaterial = new THREE.MeshStandardMaterial({
    color: 0xbd1745,
    emissive: 0x8e092e,
    emissiveIntensity: 1.1,
    roughness: 0.4,
  });
  private readonly beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xe21c53,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly light = new THREE.PointLight(0xff285f, 0, 8, 2);
  private readonly halo: THREE.Mesh;
  private readonly arrow: THREE.Mesh;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private elapsed = 0;
  private active = false;
  private disposed = false;

  constructor(scene: THREE.Scene) {
    this.group.name = 'GoalOpportunityBeacon';
    this.group.position.set(0, 0, OPPONENT_GOAL_Z);

    const postGeometry = this.track(new THREE.BoxGeometry(0.16, 2.7, 0.16));
    const crossbarGeometry = this.track(new THREE.BoxGeometry(5.3, 0.16, 0.16));
    const haloGeometry = this.track(new THREE.TorusGeometry(1.05, 0.09, 8, 28));
    const arrowGeometry = this.track(new THREE.ConeGeometry(0.32, 0.72, 5));
    const beamGeometry = this.track(new THREE.CylinderGeometry(1.45, 2.35, 5.5, 16, 1, true));

    const leftPost = this.makeMesh(postGeometry, this.goldMaterial, -2.55, 1.35, 0);
    const rightPost = this.makeMesh(postGeometry, this.goldMaterial, 2.55, 1.35, 0);
    const crossbar = this.makeMesh(crossbarGeometry, this.goldMaterial, 0, 2.62, 0);

    this.halo = this.makeMesh(haloGeometry, this.crimsonMaterial, 0, 2.85, 0.08);
    this.arrow = this.makeMesh(arrowGeometry, this.goldMaterial, 0, 4.1, 0.08);
    this.arrow.rotation.z = Math.PI;

    const beam = this.makeMesh(beamGeometry, this.beamMaterial, 0, 2.75, -0.12);
    beam.castShadow = false;
    beam.renderOrder = 1;

    this.light.position.set(0, 2.3, 0.8);
    this.light.castShadow = false;
    this.group.add(leftPost, rightPost, crossbar, beam, this.halo, this.arrow, this.light);
    this.group.visible = false;
    scene.add(this.group);
  }

  setActive(active: boolean): void {
    if (this.disposed || this.active === active) return;
    this.active = active;
    this.group.visible = active;
    if (active) this.elapsed = 0;
    else this.light.intensity = 0;
  }

  update(dt: number): void {
    if (!this.active || this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    this.elapsed += Math.min(dt, 0.1);
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 5.2);
    const scale = 1 + pulse * 0.12;
    this.halo.scale.setScalar(scale);
    this.halo.rotation.z = this.elapsed * 0.65;
    this.arrow.position.y = 4.1 + Math.sin(this.elapsed * 4.2) * 0.16;
    this.goldMaterial.emissiveIntensity = 0.62 + pulse * 0.52;
    this.crimsonMaterial.emissiveIntensity = 0.9 + pulse * 1.1;
    this.beamMaterial.opacity = 0.07 + pulse * 0.07;
    this.light.intensity = 1.2 + pulse * 1.3;
  }

  reset(): void {
    if (this.disposed) return;
    this.active = false;
    this.elapsed = 0;
    this.group.visible = false;
    this.halo.scale.setScalar(1);
    this.halo.rotation.z = 0;
    this.arrow.position.y = 4.1;
    this.light.intensity = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    this.goldMaterial.dispose();
    this.crimsonMaterial.dispose();
    this.beamMaterial.dispose();
    this.light.dispose();
    this.disposed = true;
  }

  private track<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private makeMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = material !== this.beamMaterial;
    return mesh;
  }
}
