import * as THREE from 'three';
import type { Vec3 } from '../../game/simulation/types';
import type { RenderQuality } from '../../settings/SettingsStore';
import { STADIUM_VARIANTS, type StadiumVariantId } from './stadiumVariants';

/** A subtle shadow-free fill that follows the hero and adapts to every stadium palette. */
export class CharacterReadabilityLight {
  private readonly light = new THREE.PointLight(0xffffff, 2.2, 8.5, 2);
  private readonly blendedColor = new THREE.Color();
  private stadium: THREE.Object3D | null = null;
  private quality: RenderQuality = 'balanced';
  private disposed = false;

  public constructor(private readonly scene: THREE.Scene) {
    this.light.name = 'player-readability-light';
    this.light.castShadow = false;
    this.scene.add(this.light);
    this.refreshPalette();
  }

  public setQuality(quality: RenderQuality): void {
    this.quality = quality;
  }

  public update(position: Vec3): void {
    if (this.disposed) return;
    if (this.scene.getObjectByName('stadium-environment') !== this.stadium) this.refreshPalette();
    this.light.position.set(position.x, position.y + 2.35, position.z + 0.8);
    this.light.intensity = this.quality === 'performance' ? 1.25 : this.quality === 'quality' ? 2.65 : 2.05;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.light.removeFromParent();
    this.light.dispose();
    this.disposed = true;
  }

  private refreshPalette(): void {
    this.stadium = this.scene.getObjectByName('stadium-environment') ?? null;
    const variantId = this.stadium?.userData.variantId as StadiumVariantId | undefined;
    const variant = variantId ? STADIUM_VARIANTS[variantId] : STADIUM_VARIANTS['blood-court'];
    this.blendedColor.setHex(variant.fillLight).lerp(new THREE.Color(0xffffff), 0.48);
    this.light.color.copy(this.blendedColor);
  }
}
