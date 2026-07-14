import * as THREE from 'three';
import type { MatchStage } from '../../game/match';
import { STADIUM_VARIANTS, type StadiumAmbiencePreset, type StadiumVariantId } from './stadiumVariants';

const PARTICLE_COUNT = 240;
const CROWD_NAMES = ['stadium-crowd-bodies', 'stadium-crowd-heads'] as const;

interface CrowdCache {
  readonly mesh: THREE.InstancedMesh;
  readonly basePositions: Float32Array;
  readonly isHead: boolean;
}

interface PropPieceCache {
  readonly object: THREE.Object3D;
  readonly position: THREE.Vector3;
  readonly rotation: THREE.Euler;
  readonly seed: number;
}

/** Render-only stadium motion, weather and crowd reactions. */
export class StadiumAmbience {
  private readonly scene: THREE.Scene;
  private readonly group = new THREE.Group();
  private readonly positions = new Float32Array(PARTICLE_COUNT * 3);
  private readonly drift = new Float32Array(PARTICLE_COUNT);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.PointsMaterial({
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  private readonly particles: THREE.Points;
  private readonly particleColor = new THREE.Color();
  private readonly particleAccent = new THREE.Color();
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly rotation = new THREE.Quaternion();
  private crowd: CrowdCache[] = [];
  private rails: THREE.Mesh[] = [];
  private banners: THREE.Object3D[] = [];
  private flags: THREE.Object3D[] = [];
  private propPieces: PropPieceCache[] = [];
  private stadium: THREE.Object3D | null = null;
  private preset: StadiumAmbiencePreset = STADIUM_VARIANTS['blood-court'].ambience;
  private elapsed = 0;
  private cheer = 0;
  private phaseEnergy = 0;
  private propDamage = 0;
  private propImpulse = 0;
  private disposed = false;

  public constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'stadium-ambience';
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particles = new THREE.Points(this.geometry, this.material);
    this.particles.name = 'stadium-weather-particles';
    this.particles.frustumCulled = false;
    this.group.add(this.particles);
    scene.add(this.group);
    this.seedParticles();
    this.refreshStadium();
  }

  public get weather(): StadiumAmbiencePreset['weather'] {
    return this.preset.weather;
  }

  public get cheerLevel(): number {
    return this.cheer;
  }

  public get reactivePropDamage(): number {
    return this.propDamage;
  }

  public setPhase(stage: MatchStage): void {
    this.phaseEnergy =
      stage === 'finalWave' || stage === 'finalGoal'
        ? 1
        : stage === 'bloodMoon'
          ? 0.82
          : stage === 'escalation'
            ? 0.42
            : 0;
  }

  public celebrate(strength = 1): void {
    if (this.disposed) return;
    this.cheer = Math.max(this.cheer, THREE.MathUtils.clamp(strength, 0, 1.5));
  }

  public burstProps(strength = 1): void {
    if (this.disposed) return;
    const safeStrength = THREE.MathUtils.clamp(strength, 0, 1.5);
    this.propDamage = THREE.MathUtils.clamp(this.propDamage + safeStrength * 0.24, 0, 1);
    this.propImpulse = Math.max(this.propImpulse, safeStrength);
  }

  public update(dt: number): void {
    if (this.disposed) return;
    const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
    this.elapsed += safeDt;
    if (this.scene.getObjectByName('stadium-environment') !== this.stadium) this.refreshStadium();
    this.cheer = Math.max(0, this.cheer - safeDt * 0.44);
    this.propImpulse = Math.max(0, this.propImpulse - safeDt * 1.75);
    this.updateWeather(safeDt);
    this.updateCrowd();
    this.updateEnvironment();
    this.updateReactiveProps();
  }

  public reset(): void {
    this.cheer = 0;
    this.phaseEnergy = 0;
    this.propDamage = 0;
    this.propImpulse = 0;
    this.elapsed = 0;
    this.restoreReactiveProps();
    this.seedParticles();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.group.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.crowd.length = 0;
    this.rails.length = 0;
    this.banners.length = 0;
    this.flags.length = 0;
    this.propPieces.length = 0;
    this.disposed = true;
  }

  private refreshStadium(): void {
    this.stadium = this.scene.getObjectByName('stadium-environment') ?? null;
    const variantId = this.stadium?.userData.variantId as StadiumVariantId | undefined;
    this.preset = variantId ? STADIUM_VARIANTS[variantId].ambience : STADIUM_VARIANTS['blood-court'].ambience;
    this.material.color.setHex(this.preset.particleColor);
    this.particleColor.setHex(this.preset.particleColor);
    this.particleAccent.setHex(this.preset.particleAccent);
    this.material.size = this.preset.particleSize;
    this.crowd = [];
    this.rails = [];
    this.banners = [];
    this.flags = [];
    this.propPieces = [];
    for (const name of CROWD_NAMES) {
      const mesh = this.stadium?.getObjectByName(name);
      if (!(mesh instanceof THREE.InstancedMesh)) continue;
      const basePositions = new Float32Array(mesh.count * 3);
      for (let index = 0; index < mesh.count; index += 1) {
        mesh.getMatrixAt(index, this.matrix);
        basePositions[index * 3] = this.matrix.elements[12]!;
        basePositions[index * 3 + 1] = this.matrix.elements[13]!;
        basePositions[index * 3 + 2] = this.matrix.elements[14]!;
      }
      this.crowd.push({ mesh, basePositions, isHead: name === 'stadium-crowd-heads' });
    }
    this.stadium?.traverse((object) => {
      if (object.name === 'arena-light-rail' && object instanceof THREE.Mesh) this.rails.push(object);
      else if (object.name === 'stadium-reactive-banner') this.banners.push(object);
      else if (object.name === 'stadium-corner-flag') this.flags.push(object);
      else if (object.parent?.name === 'stadium-reactive-prop') {
        this.propPieces.push({
          object,
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          seed: pseudoRandom(this.propPieces.length * 13 + 71),
        });
      }
    });
    this.seedParticles();
  }

  private seedParticles(): void {
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const seed = pseudoRandom(index + 17);
      this.positions[index * 3] = (pseudoRandom(index * 3 + 5) - 0.5) * 104;
      this.positions[index * 3 + 1] = 0.8 + pseudoRandom(index * 5 + 31) * 22;
      this.positions[index * 3 + 2] = (pseudoRandom(index * 7 + 11) - 0.5) * 146;
      this.drift[index] = seed * 2 - 1;
    }
    this.geometry.attributes.position!.needsUpdate = true;
  }

  private updateWeather(dt: number): void {
    const upward = this.preset.fallSpeed < 0;
    const speed = this.preset.fallSpeed * dt;
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const offset = index * 3;
      const flutter = Math.sin(this.elapsed * (0.7 + (index % 5) * 0.13) + index) * this.preset.wind;
      this.positions[offset] =
        this.positions[offset]! + (this.drift[index]! * this.preset.wind + flutter * 0.18) * dt;
      this.positions[offset + 1] = this.positions[offset + 1]! - speed;
      if (upward && this.positions[offset + 1]! > 23) this.positions[offset + 1] = 0.6;
      if (!upward && this.positions[offset + 1]! < 0.35) this.positions[offset + 1] = 22;
      if (this.positions[offset]! > 53) this.positions[offset] = -53;
      else if (this.positions[offset]! < -53) this.positions[offset] = 53;
    }
    this.material.opacity = 0.52 + this.phaseEnergy * 0.18 + Math.sin(this.elapsed * 0.7) * 0.06;
    this.material.color.lerpColors(
      this.particleColor,
      this.particleAccent,
      0.22 + Math.sin(this.elapsed * 0.55) * 0.18,
    );
    this.geometry.attributes.position!.needsUpdate = true;
  }

  private updateCrowd(): void {
    const energy = 0.035 + this.phaseEnergy * 0.055 + this.cheer * 0.62;
    for (const cache of this.crowd) {
      for (let index = 0; index < cache.mesh.count; index += 1) {
        const offset = index * 3;
        const wave = Math.sin(this.elapsed * (3.2 + this.cheer * 3) + index * 0.34);
        const bounce = Math.max(-0.025, wave) * energy;
        this.position.set(
          cache.basePositions[offset]!,
          cache.basePositions[offset + 1]! + bounce,
          cache.basePositions[offset + 2]!,
        );
        const stretch = cache.isHead ? 1 : 1 + Math.max(0, wave) * this.cheer * 0.1;
        this.scale.set(1, stretch, 1);
        this.matrix.compose(this.position, this.rotation, this.scale);
        cache.mesh.setMatrixAt(index, this.matrix);
      }
      cache.mesh.instanceMatrix.needsUpdate = true;
      const material = cache.mesh.material;
      if (material instanceof THREE.MeshStandardMaterial)
        material.emissiveIntensity = 0.36 + this.phaseEnergy * 0.28 + this.cheer * 0.65;
    }
  }

  private updateEnvironment(): void {
    const pulse = 0.72 + Math.sin(this.elapsed * (1.7 + this.cheer * 2.2)) * 0.22;
    for (const rail of this.rails) {
      const material = rail.material;
      if (material instanceof THREE.MeshStandardMaterial)
        material.emissiveIntensity = 0.52 + pulse * (0.3 + this.phaseEnergy * 0.55 + this.cheer * 0.9);
    }
    for (const banner of this.banners)
      banner.rotation.y =
        Math.sin(this.elapsed * 1.8 + banner.position.x * 0.18) * (0.025 + this.cheer * 0.12);
    for (const flag of this.flags)
      flag.rotation.z = Math.sin(this.elapsed * 3.1 + flag.position.z) * (0.045 + this.cheer * 0.1);
  }

  private updateReactiveProps(): void {
    if (this.propDamage <= 0 && this.propImpulse <= 0) return;
    const wobble = Math.sin(this.elapsed * 18) * this.propImpulse;
    for (let index = 0; index < this.propPieces.length; index += 1) {
      const piece = this.propPieces[index]!;
      const direction = piece.seed > 0.5 ? 1 : -1;
      const fracture = Math.max(0, this.propDamage - (index % 4) * 0.08);
      piece.object.position.set(
        piece.position.x + direction * fracture * (0.28 + piece.seed * 0.52),
        Math.max(0.08, piece.position.y - fracture * fracture * (0.24 + piece.seed * 0.55)),
        piece.position.z + (piece.seed - 0.5) * fracture * 0.7,
      );
      piece.object.rotation.set(
        piece.rotation.x + fracture * direction * 0.38,
        piece.rotation.y + wobble * direction * 0.025,
        piece.rotation.z + fracture * (piece.seed - 0.5) * 0.9,
      );
    }
  }

  private restoreReactiveProps(): void {
    for (const piece of this.propPieces) {
      piece.object.position.copy(piece.position);
      piece.object.rotation.copy(piece.rotation);
    }
  }
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 91.3458) * 47_458.5453;
  return value - Math.floor(value);
}
