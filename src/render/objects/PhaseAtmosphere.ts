import * as THREE from 'three';
import type { MatchStage } from '../../game/match';

const PARTICLE_COUNT = 56;

interface AtmospherePreset {
  background: number;
  fog: number;
  density: number;
  accent: number;
  accentIntensity: number;
  embers: number;
}

const PRESETS: Readonly<Record<MatchStage, AtmospherePreset>> = Object.freeze({
  opening: preset(0x080811, 0x080811, 0.018, 0x5877d8, 0.18, 0.08),
  firstHalf: preset(0x080811, 0x090812, 0.018, 0x7c5bda, 0.22, 0.12),
  goalOpportunity: preset(0x100d12, 0x100a11, 0.016, 0xffc94d, 0.62, 0.2),
  escalation: preset(0x10070e, 0x120710, 0.021, 0xe52d5b, 0.44, 0.36),
  halftimeChoice: preset(0x090a15, 0x090a15, 0.017, 0x8ea7ff, 0.34, 0.12),
  bloodMoon: preset(0x1b050b, 0x21050d, 0.026, 0xff174f, 1.05, 0.92),
  finalGoal: preset(0x16080b, 0x19070c, 0.021, 0xffbf43, 0.9, 0.56),
  finalWave: preset(0x18040d, 0x21040e, 0.028, 0xff174f, 1.25, 1),
  victory: preset(0x15120c, 0x15100a, 0.012, 0xffdc78, 0.72, 0.22),
  dead: preset(0x040407, 0x050508, 0.032, 0x68112c, 0.12, 0.02),
});

/** Phase-reactive scene accents that restore the scene's original core resources on disposal. */
export class PhaseAtmosphere {
  private readonly originalBackground: THREE.Scene['background'];
  private readonly originalFog: THREE.Scene['fog'];
  private readonly background = new THREE.Color();
  private readonly fog = new THREE.FogExp2(0x080811, 0.018);
  private readonly targetBackground = new THREE.Color();
  private readonly targetFog = new THREE.Color();
  private readonly targetAccent = new THREE.Color();
  private readonly accent = new THREE.PointLight(0x5877d8, 0, 34, 2);
  private readonly particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly particlePositions: Float32Array;
  private readonly particleSpeeds: Float32Array;
  private targetDensity = 0.018;
  private targetAccentIntensity = 0;
  private targetEmberOpacity = 0;
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {
    this.originalBackground = scene.background;
    this.originalFog = scene.fog;
    const initial = PRESETS.opening;
    this.background.setHex(initial.background);
    this.fog.color.setHex(initial.fog);
    this.targetBackground.copy(this.background);
    this.targetFog.copy(this.fog.color);
    this.targetAccent.setHex(initial.accent);
    this.accent.color.copy(this.targetAccent);
    this.accent.position.set(0, 7, 0);

    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleSpeeds = new Float32Array(PARTICLE_COUNT);
    seedParticles(this.particlePositions, this.particleSpeeds);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const material = new THREE.PointsMaterial({
      color: 0xff315d,
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geometry, material);
    this.particles.frustumCulled = false;
    scene.background = this.background;
    scene.fog = this.fog;
    scene.add(this.accent, this.particles);
    this.setPhase('opening');
  }

  setPhase(stage: MatchStage): void {
    if (this.disposed) return;
    const next = PRESETS[stage];
    this.targetBackground.setHex(next.background);
    this.targetFog.setHex(next.fog);
    this.targetAccent.setHex(next.accent);
    this.targetDensity = next.density;
    this.targetAccentIntensity = next.accentIntensity;
    this.targetEmberOpacity = next.embers;
  }

  update(dt: number): void {
    if (this.disposed) return;
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    const blend = 1 - Math.exp(-2.8 * safeDt);
    this.background.lerp(this.targetBackground, blend);
    this.fog.color.lerp(this.targetFog, blend);
    this.fog.density = THREE.MathUtils.lerp(this.fog.density, this.targetDensity, blend);
    this.accent.color.lerp(this.targetAccent, blend);
    this.accent.intensity = THREE.MathUtils.lerp(this.accent.intensity, this.targetAccentIntensity, blend);
    this.particles.material.opacity = THREE.MathUtils.lerp(
      this.particles.material.opacity,
      this.targetEmberOpacity,
      blend,
    );
    this.particles.visible = this.particles.material.opacity > 0.01;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const yOffset = index * 3 + 1;
      this.particlePositions[yOffset]! += this.particleSpeeds[index]! * safeDt;
      if (this.particlePositions[yOffset]! > 7) this.particlePositions[yOffset] = 0.08;
    }
    this.particles.geometry.attributes.position!.needsUpdate = true;
  }

  reset(): void {
    if (this.disposed) return;
    const initial = PRESETS.opening;
    this.background.setHex(initial.background);
    this.fog.color.setHex(initial.fog);
    this.fog.density = initial.density;
    this.accent.color.setHex(initial.accent);
    this.accent.intensity = initial.accentIntensity;
    this.particles.material.opacity = initial.embers;
    seedParticles(this.particlePositions, this.particleSpeeds);
    this.particles.geometry.attributes.position!.needsUpdate = true;
    this.setPhase('opening');
  }

  dispose(): void {
    if (this.disposed) return;
    this.scene.remove(this.accent, this.particles);
    this.particles.geometry.dispose();
    this.particles.material.dispose();
    if (this.scene.background === this.background) this.scene.background = this.originalBackground;
    if (this.scene.fog === this.fog) this.scene.fog = this.originalFog;
    this.disposed = true;
  }
}

function preset(
  background: number,
  fog: number,
  density: number,
  accent: number,
  accentIntensity: number,
  embers: number,
): AtmospherePreset {
  return { background, fog, density, accent, accentIntensity, embers };
}

function seedParticles(positions: Float32Array, speeds: Float32Array): void {
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + (index % 5) * 0.23;
    const radius = 5 + ((index * 7) % 17) * 1.05;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = 0.1 + ((index * 13) % 31) * 0.21;
    positions[offset + 2] = Math.sin(angle) * radius;
    speeds[index] = 0.35 + (index % 9) * 0.075;
  }
}
