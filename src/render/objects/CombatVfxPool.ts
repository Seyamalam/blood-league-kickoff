import * as THREE from 'three';
import type { Vec3 } from '../../game/simulation/types';
import type { RenderQuality } from '../../settings/SettingsStore';

export type CombatVfxStyle = 'kick' | 'volley' | 'goal' | 'tackle' | 'blood' | 'heal' | 'boss';

interface StylePreset {
  readonly color: number;
  readonly accent: number;
  readonly duration: number;
  readonly beam: number;
  readonly spread: number;
}

interface VfxSlot {
  readonly group: THREE.Group;
  readonly core: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly arc: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  age: number;
  duration: number;
  spread: number;
  strength: number;
}

const POOL_SIZE = 6;
const PRESETS: Readonly<Record<CombatVfxStyle, StylePreset>> = {
  kick: { color: 0xffd66b, accent: 0xff6d3d, duration: 0.3, beam: 0.15, spread: 1.45 },
  volley: { color: 0xfff0a8, accent: 0xff315d, duration: 0.42, beam: 0.55, spread: 2.05 },
  goal: { color: 0xff315d, accent: 0xffd66b, duration: 0.75, beam: 3.2, spread: 4.5 },
  tackle: { color: 0xc99562, accent: 0x5e341f, duration: 0.36, beam: 0, spread: 2.3 },
  blood: { color: 0xe51f52, accent: 0x6d061e, duration: 0.34, beam: 0.35, spread: 1.8 },
  heal: { color: 0x74ffbb, accent: 0xd8fff0, duration: 0.55, beam: 1.4, spread: 2.2 },
  boss: { color: 0xb66cff, accent: 0xff315d, duration: 0.88, beam: 4.8, spread: 5.6 },
};

/** Bounded, render-only accent grammar layered over the lightweight particle bursts. */
export class CombatVfxPool {
  private readonly slots: VfxSlot[];
  private cursor = 0;
  private quality: RenderQuality = 'balanced';
  private reducedFlashes = false;
  private disposed = false;

  public constructor(private readonly scene: THREE.Scene) {
    this.slots = Array.from({ length: POOL_SIZE }, (_, index) => this.createSlot(index));
  }

  public setQuality(quality: RenderQuality): void {
    this.quality = quality;
  }

  public setReducedFlashes(active: boolean): void {
    this.reducedFlashes = active;
  }

  public trigger(style: CombatVfxStyle, position: Vec3, intensity = 1): void {
    if (this.disposed) return;
    const preset = PRESETS[style];
    const slot = this.slots[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.slots.length;
    const strength = Number.isFinite(intensity) ? THREE.MathUtils.clamp(intensity, 0.2, 2) : 1;
    const opacity = this.reducedFlashes ? 0.28 : 0.76;
    slot.age = 0;
    slot.duration = this.reducedFlashes ? Math.min(0.22, preset.duration) : preset.duration;
    slot.spread = preset.spread;
    slot.strength = strength;
    slot.group.position.set(position.x, Math.max(0.06, position.y), position.z);
    slot.group.scale.setScalar(0.2 + strength * 0.08);
    slot.group.visible = true;
    slot.core.material.color.setHex(preset.color);
    slot.core.material.opacity = opacity;
    slot.ring.material.color.setHex(preset.accent);
    slot.ring.material.opacity = opacity * 0.9;
    slot.arc.material.color.setHex(preset.color);
    slot.arc.material.opacity = opacity;
    slot.beam.material.color.setHex(preset.accent);
    slot.beam.material.opacity = opacity * 0.62;
    slot.core.visible = this.quality !== 'performance' || style === 'goal' || style === 'boss';
    slot.arc.visible = style !== 'heal' && (this.quality !== 'performance' || style === 'volley');
    slot.beam.visible = preset.beam > 0 && this.quality !== 'performance';
    slot.beam.scale.set(1, Math.max(0.01, preset.beam), 1);
    slot.beam.position.y = preset.beam * 0.5;
    slot.ring.rotation.set(-Math.PI / 2, 0, style === 'tackle' ? Math.PI * 0.5 : 0);
    slot.arc.rotation.set(style === 'tackle' ? -Math.PI / 2 : 0, 0, style === 'blood' ? 0.65 : 0);
  }

  public update(dt: number): void {
    if (this.disposed) return;
    const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
    for (const slot of this.slots) {
      if (!slot.group.visible) continue;
      slot.age += safeDt;
      if (slot.age >= slot.duration) {
        slot.group.visible = false;
        continue;
      }
      const progress = slot.age / slot.duration;
      const expansion = 1 - (1 - progress) ** 3;
      const scale = THREE.MathUtils.lerp(0.24, slot.spread, expansion) * slot.strength;
      slot.group.scale.setScalar(scale);
      slot.core.rotation.y += safeDt * 8;
      slot.core.rotation.x += safeDt * 5;
      slot.ring.rotation.z += safeDt * 3;
      slot.arc.rotation.z -= safeDt * 2.2;
      const fade = (1 - progress) ** 1.7 * (this.reducedFlashes ? 0.28 : 0.76);
      slot.core.material.opacity = fade;
      slot.ring.material.opacity = fade * 0.9;
      slot.arc.material.opacity = fade;
      slot.beam.material.opacity = fade * 0.62;
    }
  }

  public reset(): void {
    for (const slot of this.slots) {
      slot.group.visible = false;
      slot.age = slot.duration;
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    for (const slot of this.slots) {
      slot.group.removeFromParent();
      for (const mesh of [slot.core, slot.ring, slot.arc, slot.beam]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    }
    this.disposed = true;
  }

  private createSlot(index: number): VfxSlot {
    const additive = (color: number) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
    const group = new THREE.Group();
    group.name = `pooled-signature-vfx-${index}`;
    group.visible = false;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), additive(0xffffff));
    core.name = 'signature-vfx-core';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 5, 28), additive(0xffffff));
    ring.name = 'signature-vfx-ring';
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.065, 5, 24, Math.PI * 1.35),
      additive(0xffffff),
    );
    arc.name = 'signature-vfx-arc';
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.16, 1, 8, 1, true), additive(0xffffff));
    beam.name = 'signature-vfx-beam';
    group.add(core, ring, arc, beam);
    this.scene.add(group);
    return { group, core, ring, arc, beam, age: 1, duration: 1, spread: 1, strength: 1 };
  }
}
