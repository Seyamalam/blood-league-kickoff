import * as THREE from 'three';
import type { RenderQuality } from '../../settings/SettingsStore';
import { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import { STADIUM_VARIANTS, type StadiumVariantId } from './stadiumVariants';

const STAR_COUNT = 320;
const QUALITY_STAR_DRAW_RANGE: Readonly<Record<RenderQuality, number>> = Object.freeze({
  performance: 90,
  balanced: 210,
  quality: STAR_COUNT,
});

/** Lightweight authored presentation layer: moon, stars, pitch rim, light shafts, and accent fills. */
export class ArenaBeautyPass {
  private readonly root = new THREE.Group();
  private readonly stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly moon: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly moonHalo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly moonCraters = new THREE.Group();
  private readonly pitchRim: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly beams = new THREE.Group();
  private readonly accentLights: readonly THREE.PointLight[];
  private elapsed = 0;
  private reducedMotion = false;
  private stadiumId: StadiumVariantId | null = null;
  private disposed = false;

  public constructor(private readonly scene: THREE.Scene) {
    this.root.name = 'arena-beauty-pass';
    this.stars = createStars();
    this.moon = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 40),
      new THREE.MeshBasicMaterial({ color: 0xdce8ff, transparent: true, opacity: 0.78, fog: false }),
    );
    this.moon.name = 'arena-moon-disc';
    this.moon.position.set(34, 31, -108);
    this.moon.renderOrder = -2;
    this.moonHalo = new THREE.Mesh(
      new THREE.RingGeometry(9.2, 12.8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x8da9ff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.moonHalo.name = 'arena-moon-halo';
    this.moonHalo.position.copy(this.moon.position);
    this.moonCraters.name = 'arena-moon-craters';
    for (const [x, y, radius] of [
      [-2.7, 1.8, 1.45],
      [2.4, 2.6, 1.05],
      [1.2, -2.4, 1.7],
      [-3.4, -2.2, 0.82],
      [3.5, -0.6, 0.68],
    ] as const) {
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 20),
        new THREE.MeshBasicMaterial({
          color: 0x7e8ba3,
          transparent: true,
          opacity: 0.17,
          depthWrite: false,
          fog: false,
        }),
      );
      crater.position.set(this.moon.position.x + x, this.moon.position.y + y, this.moon.position.z + 0.08);
      this.moonCraters.add(crater);
    }
    this.pitchRim = createPitchRim();
    this.beams.name = 'arena-light-shafts';
    for (const [x, z, tilt] of [
      [-43, -52, -0.18],
      [43, -52, 0.18],
      [-43, 52, -0.18],
      [43, 52, 0.18],
    ] as const) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(7.5, 25, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xbfcfff,
          transparent: true,
          opacity: 0.035,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      beam.position.set(x, 12, z);
      beam.rotation.z = tilt;
      this.beams.add(beam);
    }
    const leftAccent = new THREE.PointLight(0xd12d5d, 4.2, 24, 2);
    const rightAccent = new THREE.PointLight(0xd12d5d, 4.2, 24, 2);
    leftAccent.position.set(-PITCH_HALF_WIDTH + 4, 3.4, 0);
    rightAccent.position.set(PITCH_HALF_WIDTH - 4, 3.4, 0);
    this.accentLights = [leftAccent, rightAccent];
    this.root.add(
      this.stars,
      this.moon,
      this.moonHalo,
      this.moonCraters,
      this.pitchRim,
      this.beams,
      ...this.accentLights,
    );
    scene.add(this.root);
    this.refreshPalette();
  }

  public setQuality(quality: RenderQuality): void {
    this.stars.geometry.setDrawRange(0, QUALITY_STAR_DRAW_RANGE[quality]);
    this.beams.visible = quality === 'quality';
    this.moonHalo.visible = quality !== 'performance';
    this.moonCraters.visible = quality !== 'performance';
    for (const light of this.accentLights) light.visible = quality === 'quality';
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public update(dt: number): void {
    if (this.disposed) return;
    const currentStadium = this.scene.getObjectByName('stadium-environment')?.userData.variantId as
      StadiumVariantId | undefined;
    if (currentStadium && currentStadium !== this.stadiumId) this.refreshPalette(currentStadium);
    if (this.reducedMotion) return;
    const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
    this.elapsed += safeDt;
    this.stars.rotation.y = this.elapsed * 0.0035;
    const breathe = 1 + Math.sin(this.elapsed * 0.35) * 0.025;
    this.moonHalo.scale.setScalar(breathe);
    this.moonHalo.material.opacity = 0.085 + Math.sin(this.elapsed * 0.5) * 0.018;
    this.pitchRim.material.opacity = 0.18 + Math.sin(this.elapsed * 0.72) * 0.035;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.root.removeFromParent();
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line))
        return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
    this.disposed = true;
  }

  private refreshPalette(stadiumId?: StadiumVariantId): void {
    const resolved =
      stadiumId ??
      ((this.scene.getObjectByName('stadium-environment')?.userData.variantId as StadiumVariantId) ||
        'blood-court');
    this.stadiumId = resolved;
    const variant = STADIUM_VARIANTS[resolved];
    this.pitchRim.material.color.setHex(variant.accent);
    this.moonHalo.material.color.setHex(variant.fillLight);
    this.stars.material.color.setHex(variant.ambientSky);
    for (const light of this.accentLights) light.color.setHex(variant.accent);
    for (const beam of this.beams.children) {
      if (beam instanceof THREE.Mesh && beam.material instanceof THREE.MeshBasicMaterial) {
        beam.material.color.setHex(variant.keyLight);
      }
    }
  }
}

function createStars(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const angle = index * 2.399963229728653;
    const radius = 72 + ((index * 17) % 58);
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 15 + ((index * 29) % 62);
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xaec9ff,
    size: 0.22,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = 'arena-star-field';
  stars.frustumCulled = false;
  return stars;
}

function createPitchRim(): THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const margin = 0.65;
  const points = [
    new THREE.Vector3(-PITCH_HALF_WIDTH - margin, 0.045, -PITCH_HALF_LENGTH - margin),
    new THREE.Vector3(PITCH_HALF_WIDTH + margin, 0.045, -PITCH_HALF_LENGTH - margin),
    new THREE.Vector3(PITCH_HALF_WIDTH + margin, 0.045, PITCH_HALF_LENGTH + margin),
    new THREE.Vector3(-PITCH_HALF_WIDTH - margin, 0.045, PITCH_HALF_LENGTH + margin),
  ];
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: 0xd12d5d,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  line.name = 'arena-pitch-rim-light';
  return line;
}
