import * as THREE from 'three';
import { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import type { PlayerState, Vec3 } from '../../game/simulation/types';
import type { RenderQuality } from '../../settings/SettingsStore';
import { STADIUM_VARIANTS, type StadiumVariantId } from './stadiumVariants';

interface SurfaceEntry {
  age: number;
  duration: number;
  x: number;
  z: number;
  rotation: number;
  scale: number;
}

interface SurfacePool {
  readonly mesh: THREE.InstancedMesh;
  readonly entries: SurfaceEntry[];
  cursor: number;
}

const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

/** Bounded instanced turf marks and weather contacts; never feeds back into simulation. */
export class PitchSurfaceEffects {
  private readonly footprintPool: SurfacePool;
  private readonly skidPool: SurfacePool;
  private readonly slidePool: SurfacePool;
  private readonly splashPool: SurfacePool;
  private readonly dummy = new THREE.Object3D();
  private lastPlayer: THREE.Vector2 | null = null;
  private lastSlide: THREE.Vector2 | null = null;
  private lastBall: THREE.Vector2 | null = null;
  private footprintSide = -1;
  private splashClock = 0;
  private randomCursor = 1;
  private stadium: THREE.Object3D | null = null;
  private drizzle = false;
  private quality: RenderQuality = 'balanced';
  private disposed = false;

  public constructor(private readonly scene: THREE.Scene) {
    this.footprintPool = this.createPool(
      'pitch-footprint-pool',
      new THREE.PlaneGeometry(0.2, 0.48),
      new THREE.MeshBasicMaterial({ color: 0x13261d, transparent: true, opacity: 0.35, depthWrite: false }),
      24,
    );
    this.skidPool = this.createPool(
      'pitch-ball-skid-pool',
      new THREE.PlaneGeometry(0.11, 1.05),
      new THREE.MeshBasicMaterial({ color: 0x171b18, transparent: true, opacity: 0.42, depthWrite: false }),
      18,
    );
    this.slidePool = this.createPool(
      'pitch-slide-trail-pool',
      new THREE.PlaneGeometry(0.52, 1.7),
      new THREE.MeshBasicMaterial({ color: 0x493629, transparent: true, opacity: 0.36, depthWrite: false }),
      12,
    );
    this.splashPool = this.createPool(
      'pitch-rain-splash-pool',
      new THREE.RingGeometry(0.11, 0.16, 10),
      new THREE.MeshBasicMaterial({ color: 0xb9e4ff, transparent: true, opacity: 0.42, depthWrite: false }),
      16,
    );
    this.refreshWeather();
  }

  public setQuality(quality: RenderQuality): void {
    this.quality = quality;
    this.splashPool.mesh.visible = quality !== 'performance';
  }

  public sync(player: PlayerState, ball: Vec3, ballSpeed: number, dt: number): void {
    if (this.disposed) return;
    if (this.scene.getObjectByName('stadium-environment') !== this.stadium) this.refreshWeather();
    const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
    this.updatePool(this.footprintPool, safeDt);
    this.updatePool(this.skidPool, safeDt);
    this.updatePool(this.slidePool, safeDt);
    this.updatePool(this.splashPool, safeDt);
    this.trackPlayer(player);
    this.trackBall(ball, ballSpeed);
    this.updateRain(safeDt);
  }

  public markTackle(position: Vec3, facing = 0, intensity = 1): void {
    const safeIntensity = Number.isFinite(intensity) ? THREE.MathUtils.clamp(intensity, 0.4, 2) : 1;
    this.activate(this.slidePool, position.x, position.z, -facing, 2.8, 0.75 + safeIntensity * 0.25);
  }

  public reset(): void {
    for (const pool of [this.footprintPool, this.skidPool, this.slidePool, this.splashPool]) {
      for (let index = 0; index < pool.entries.length; index += 1) {
        pool.entries[index]!.age = pool.entries[index]!.duration;
        pool.mesh.setMatrixAt(index, HIDDEN_MATRIX);
      }
      pool.mesh.instanceMatrix.needsUpdate = true;
      pool.cursor = 0;
    }
    this.lastPlayer = null;
    this.lastSlide = null;
    this.lastBall = null;
    this.splashClock = 0;
  }

  public dispose(): void {
    if (this.disposed) return;
    for (const pool of [this.footprintPool, this.skidPool, this.slidePool, this.splashPool]) {
      pool.mesh.removeFromParent();
      pool.mesh.geometry.dispose();
      if (Array.isArray(pool.mesh.material)) {
        for (const material of pool.mesh.material) material.dispose();
      } else pool.mesh.material.dispose();
    }
    this.disposed = true;
  }

  private trackPlayer(player: PlayerState): void {
    const current = new THREE.Vector2(player.position.x, player.position.z);
    const distance = this.lastPlayer?.distanceTo(current) ?? 0;
    const spacing = this.quality === 'performance' ? 1.65 : 1.05;
    if (distance >= spacing) {
      const side = this.footprintSide;
      this.footprintSide *= -1;
      const rightX = Math.cos(player.facing);
      const rightZ = -Math.sin(player.facing);
      this.activate(
        this.footprintPool,
        current.x + rightX * side * 0.14,
        current.y + rightZ * side * 0.14,
        -player.facing,
        5.5,
        1,
      );
      this.lastPlayer = current;
    } else if (!this.lastPlayer) this.lastPlayer = current;
    const slideDistance = this.lastSlide?.distanceTo(current) ?? Infinity;
    if (player.dashTime > 0 && slideDistance > 0.65) {
      this.activate(this.slidePool, current.x, current.y, -player.facing, 2.2, 0.72);
      this.lastSlide = current.clone();
    }
    if (player.dashTime <= 0) this.lastSlide = null;
  }

  private trackBall(ball: Vec3, speed: number): void {
    const current = new THREE.Vector2(ball.x, ball.z);
    const distance = this.lastBall?.distanceTo(current) ?? 0;
    if (ball.y <= 0.46 && speed > 7 && distance > 0.72) {
      const direction = this.lastBall ? current.clone().sub(this.lastBall) : new THREE.Vector2(0, 1);
      const rotation = -Math.atan2(direction.x, direction.y);
      this.activate(
        this.skidPool,
        current.x,
        current.y,
        rotation,
        4.2,
        THREE.MathUtils.clamp(speed / 24, 0.7, 1.35),
      );
      this.lastBall = current;
    } else if (!this.lastBall || distance > 2.4) this.lastBall = current;
  }

  private updateRain(dt: number): void {
    if (!this.drizzle || this.quality === 'performance') return;
    this.splashClock -= dt;
    if (this.splashClock > 0) return;
    this.splashClock = this.quality === 'quality' ? 0.045 : 0.085;
    const x = (pseudoRandom(this.randomCursor++) - 0.5) * PITCH_HALF_WIDTH * 1.9;
    const z = (pseudoRandom(this.randomCursor++) - 0.5) * PITCH_HALF_LENGTH * 1.9;
    this.activate(this.splashPool, x, z, 0, 0.42, 0.75 + pseudoRandom(this.randomCursor++) * 0.7);
  }

  private activate(
    pool: SurfacePool,
    x: number,
    z: number,
    rotation: number,
    duration: number,
    scale: number,
  ): void {
    const index = pool.cursor;
    pool.cursor = (pool.cursor + 1) % pool.entries.length;
    const entry = pool.entries[index]!;
    entry.age = 0;
    entry.duration = duration;
    entry.x = x;
    entry.z = z;
    entry.rotation = rotation;
    entry.scale = scale;
    this.writeMatrix(pool, index, entry, 1);
  }

  private updatePool(pool: SurfacePool, dt: number): void {
    let changed = false;
    for (let index = 0; index < pool.entries.length; index += 1) {
      const entry = pool.entries[index]!;
      if (entry.age >= entry.duration) continue;
      entry.age += dt;
      if (entry.age >= entry.duration) pool.mesh.setMatrixAt(index, HIDDEN_MATRIX);
      else this.writeMatrix(pool, index, entry, Math.max(0.01, 1 - entry.age / entry.duration));
      changed = true;
    }
    if (changed) pool.mesh.instanceMatrix.needsUpdate = true;
  }

  private writeMatrix(pool: SurfacePool, index: number, entry: SurfaceEntry, fade: number): void {
    this.dummy.position.set(entry.x, 0.032, entry.z);
    this.dummy.rotation.set(-Math.PI / 2, 0, entry.rotation);
    this.dummy.scale.set(entry.scale * Math.sqrt(fade), entry.scale * fade, 1);
    this.dummy.updateMatrix();
    pool.mesh.setMatrixAt(index, this.dummy.matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  private createPool(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
  ): SurfacePool {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    const entries = Array.from({ length: capacity }, () => ({
      age: 1,
      duration: 1,
      x: 0,
      z: 0,
      rotation: 0,
      scale: 1,
    }));
    for (let index = 0; index < capacity; index += 1) mesh.setMatrixAt(index, HIDDEN_MATRIX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    return { mesh, entries, cursor: 0 };
  }

  private refreshWeather(): void {
    this.stadium = this.scene.getObjectByName('stadium-environment') ?? null;
    const variantId = this.stadium?.userData.variantId as StadiumVariantId | undefined;
    this.drizzle = variantId ? STADIUM_VARIANTS[variantId].ambience.weather === 'drizzle' : false;
  }
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}
