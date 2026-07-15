import * as THREE from 'three';
import type { Vec3 } from '../../game/simulation/types';

interface NetCache {
  readonly goal: THREE.Object3D;
  readonly net: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  readonly positions: THREE.BufferAttribute;
  readonly base: Float32Array;
  readonly direction: number;
  readonly baseOpacity: number;
  impactX: number;
  impactY: number;
  strength: number;
  age: number;
}

/** Deforms the existing lightweight goal-line geometry after impacts, without physics ownership. */
export class GoalNetResponse {
  private stadium: THREE.Object3D | null = null;
  private nets: NetCache[] = [];
  private disposed = false;

  public constructor(private readonly scene: THREE.Scene) {
    this.refresh();
  }

  public impact(worldPosition: Vec3, intensity = 1): void {
    if (this.disposed) return;
    if (this.scene.getObjectByName('stadium-environment') !== this.stadium) this.refresh();
    let selected: NetCache | undefined;
    let closest = Infinity;
    for (const cache of this.nets) {
      const goalWorld = cache.goal.getWorldPosition(new THREE.Vector3());
      const distance = Math.abs(worldPosition.z - goalWorld.z);
      if (distance < closest) {
        selected = cache;
        closest = distance;
      }
    }
    if (!selected) return;
    const local = selected.goal.worldToLocal(
      new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z),
    );
    selected.impactX = local.x;
    selected.impactY = THREE.MathUtils.clamp(local.y, 0.15, 2.65);
    selected.strength = Number.isFinite(intensity) ? THREE.MathUtils.clamp(intensity, 0.3, 2) : 1;
    selected.age = 0;
  }

  public update(dt: number): void {
    if (this.disposed) return;
    if (this.scene.getObjectByName('stadium-environment') !== this.stadium) this.refresh();
    const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
    for (const cache of this.nets) {
      if (cache.strength <= 0.001) continue;
      cache.age += safeDt;
      const envelope = Math.exp(-cache.age * 3.3) * cache.strength;
      const wave = Math.sin(cache.age * 20) * envelope;
      for (let index = 0; index < cache.positions.count; index += 1) {
        const offset = index * 3;
        const x = cache.base[offset]!;
        const y = cache.base[offset + 1]!;
        const dx = x - cache.impactX;
        const dy = y - cache.impactY;
        const influence = Math.exp(-(dx * dx * 0.22 + dy * dy * 0.75));
        cache.positions.setXYZ(
          index,
          x + dx * influence * wave * 0.035,
          y + dy * influence * wave * 0.025,
          cache.base[offset + 2]! + cache.direction * influence * wave * 0.58,
        );
      }
      cache.positions.needsUpdate = true;
      cache.net.material.opacity = Math.min(0.82, cache.baseOpacity + Math.abs(envelope) * 0.28);
      if (envelope < 0.004) {
        this.restore(cache);
        cache.strength = 0;
      }
    }
  }

  public reset(): void {
    for (const cache of this.nets) {
      this.restore(cache);
      cache.strength = 0;
      cache.age = 0;
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.nets.length = 0;
    this.stadium = null;
    this.disposed = true;
  }

  private refresh(): void {
    this.nets.length = 0;
    this.stadium = this.scene.getObjectByName('stadium-environment') ?? null;
    for (const [name, direction] of [
      ['opponent-goal', -1],
      ['home-goal', 1],
    ] as const) {
      const goal = this.stadium?.getObjectByName(name);
      if (!goal) continue;
      const net = goal?.getObjectByName('goal-net');
      if (!(net instanceof THREE.LineSegments)) continue;
      const positions = net.geometry.getAttribute('position');
      if (!(positions instanceof THREE.BufferAttribute)) continue;
      this.nets.push({
        goal,
        net: net as THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>,
        positions,
        base: Float32Array.from(positions.array as ArrayLike<number>),
        direction,
        baseOpacity: (net.material as THREE.LineBasicMaterial).opacity,
        impactX: 0,
        impactY: 1.3,
        strength: 0,
        age: 0,
      });
    }
  }

  private restore(cache: NetCache): void {
    for (let index = 0; index < cache.positions.count; index += 1) {
      const offset = index * 3;
      cache.positions.setXYZ(index, cache.base[offset]!, cache.base[offset + 1]!, cache.base[offset + 2]!);
    }
    cache.positions.needsUpdate = true;
    cache.net.material.opacity = cache.baseOpacity;
  }
}
