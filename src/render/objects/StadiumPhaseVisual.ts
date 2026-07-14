import * as THREE from 'three';
import type { MatchStage } from '../../game/match';

const BLOOD_STAGES = new Set<MatchStage>(['bloodMoon', 'finalGoal', 'finalWave']);
const ESCALATED_STAGES = new Set<MatchStage>(['escalation', 'bloodMoon', 'finalGoal', 'finalWave']);

/**
 * Lightweight stadium transformation layer. It owns only its added resources;
 * the base stadium remains managed by the scene lifecycle.
 */
export class StadiumPhaseVisual {
  private readonly group = new THREE.Group();
  private readonly moonMaterial = new THREE.MeshBasicMaterial({ color: 0xa7072e });
  private readonly coronaMaterial = new THREE.MeshBasicMaterial({
    color: 0xff174f,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  private readonly runeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff315d,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  private readonly pylonMaterial = new THREE.MeshStandardMaterial({
    color: 0x381225,
    emissive: 0xff174f,
    emissiveIntensity: 0,
    metalness: 0.72,
    roughness: 0.3,
  });
  private readonly moon: THREE.Mesh;
  private readonly corona: THREE.Mesh;
  private readonly runes: THREE.Group;
  private readonly pylons: THREE.Mesh[] = [];
  private readonly light = new THREE.DirectionalLight(0xff315d, 0);
  private readonly geometries: THREE.BufferGeometry[] = [];
  private stage: MatchStage = 'opening';
  private energy = 0;
  private disposed = false;

  public constructor(scene: THREE.Scene) {
    this.group.name = 'stadium-phase-visual';
    this.moon = new THREE.Mesh(this.track(new THREE.SphereGeometry(4.8, 20, 14)), this.moonMaterial);
    this.moon.name = 'stadium-blood-moon';
    this.moon.position.set(-20, 26, -42);

    this.corona = new THREE.Mesh(this.track(new THREE.RingGeometry(5.25, 7.1, 48)), this.coronaMaterial);
    this.corona.name = 'stadium-blood-moon-corona';
    this.corona.position.copy(this.moon.position);

    this.runes = new THREE.Group();
    this.runes.name = 'stadium-blood-runes';
    for (const radius of [8, 15, 23]) {
      const ring = new THREE.Mesh(
        this.track(new THREE.RingGeometry(radius - 0.08, radius + 0.08, 64)),
        this.runeMaterial,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.035;
      this.runes.add(ring);
    }
    for (let index = 0; index < 8; index += 1) {
      const ray = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.12, 15)), this.runeMaterial);
      ray.rotation.x = -Math.PI / 2;
      ray.rotation.z = (index / 8) * Math.PI;
      ray.position.y = 0.036;
      this.runes.add(ray);
    }

    const pylonGeometry = this.track(new THREE.CylinderGeometry(0.22, 0.45, 5.5, 6));
    for (const [x, z] of [
      [-30, -46],
      [30, -46],
      [-30, 46],
      [30, 46],
    ] as const) {
      const pylon = new THREE.Mesh(pylonGeometry, this.pylonMaterial);
      pylon.name = 'stadium-blood-pylon';
      pylon.position.set(x, 3.4, z);
      this.pylons.push(pylon);
      this.group.add(pylon);
    }
    this.light.position.set(-20, 28, -35);
    this.light.target.position.set(0, 0, 0);
    this.group.add(this.moon, this.corona, this.runes, this.light, this.light.target);
    this.group.visible = false;
    scene.add(this.group);
  }

  public get currentStage(): MatchStage {
    return this.stage;
  }

  public setPhase(stage: MatchStage): void {
    if (this.disposed) return;
    this.stage = stage;
    this.group.visible = ESCALATED_STAGES.has(stage) || stage === 'victory' || stage === 'dead';
  }

  public update(dt: number): void {
    if (this.disposed) return;
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    const target = BLOOD_STAGES.has(this.stage) ? 1 : this.stage === 'escalation' ? 0.36 : 0;
    this.energy = THREE.MathUtils.lerp(this.energy, target, 1 - Math.exp(-2.6 * safeDt));
    const time = performanceTimeSeconds();
    const pulse = 0.82 + Math.sin(time * 2.4) * 0.18;
    this.moon.visible = this.energy > 0.04;
    this.corona.visible = this.energy > 0.04;
    this.runes.visible = this.energy > 0.015;
    this.moonMaterial.color.setHex(this.stage === 'finalWave' ? 0xff113f : 0xa7072e);
    this.moon.scale.setScalar(0.72 + this.energy * 0.28);
    this.corona.scale.setScalar(0.9 + pulse * this.energy * 0.11);
    this.coronaMaterial.opacity = this.energy * (0.42 + pulse * 0.26);
    this.runeMaterial.opacity = this.energy * (0.16 + pulse * 0.2);
    this.runes.rotation.y += safeDt * (0.06 + this.energy * 0.11);
    this.pylonMaterial.emissiveIntensity = this.energy * (0.8 + pulse * 1.35);
    for (let index = 0; index < this.pylons.length; index += 1) {
      const pylon = this.pylons[index]!;
      pylon.scale.y = 0.75 + this.energy * (0.25 + Math.sin(time * 3 + index) * 0.04);
    }
    this.light.intensity = this.energy * (this.stage === 'finalWave' ? 1.5 : 0.85);
  }

  public reset(): void {
    if (this.disposed) return;
    this.stage = 'opening';
    this.energy = 0;
    this.group.visible = false;
    this.coronaMaterial.opacity = 0;
    this.runeMaterial.opacity = 0;
    this.pylonMaterial.emissiveIntensity = 0;
    this.light.intensity = 0;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    this.moonMaterial.dispose();
    this.coronaMaterial.dispose();
    this.runeMaterial.dispose();
    this.pylonMaterial.dispose();
    this.disposed = true;
  }

  private track<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }
}

function performanceTimeSeconds(): number {
  return typeof performance === 'undefined' ? 0 : performance.now() / 1_000;
}
