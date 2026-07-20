import * as THREE from 'three';
import type { EnemyState, GameState, Vec3 } from '../../game/simulation/types';
import { getEnemyArchetypeDefinition } from '../../game/simulation/enemyArchetypes';
import type { CharacterId } from '../../game/characters';
import { PlayerCharacterAsset } from '../objects/PlayerCharacterAsset';
import type { RenderQuality } from '../../settings/SettingsStore';
import {
  chooseEnemyVisualLod,
  createEnemyCharacterPresentation,
  disposeEnemyCharacterResources,
  setEnemyVisualLod,
  updateEnemyCharacterPose,
  type EnemyCharacterPresentation,
} from '../objects/EnemyCharacterVisual';
import { createFootballVisual } from '../objects/FootballVisual';
import { CombatVfxPool } from '../objects/CombatVfxPool';
import { PitchSurfaceEffects } from '../objects/PitchSurfaceEffects';
import { GoalNetResponse } from '../objects/GoalNetResponse';
import { CharacterReadabilityLight } from '../objects/CharacterReadabilityLight';
import { createVoxelHumanoid, type VoxelHumanoid } from '../objects/VoxelHumanoid';
import { voxelFootballPropGeometry } from '../objects/VoxelFootballProps';
import type { CustomCharacterAppearance } from '../../profile/CharacterCustomizationStore';

const TRAIL_POINTS = 16;
const BURST_POOL_SIZE = 4;
const BURST_PARTICLES = 14;
const RING_POOL_SIZE = 6;
let activeBridgeCount = 0;

interface HitBurst {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  positions: Float32Array;
  velocities: Float32Array;
  age: number;
  duration: number;
}

interface ImpactRing {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
  duration: number;
  startScale: number;
  endScale: number;
}

interface EnemyVisual {
  group: THREE.Group;
  bodyRoot: THREE.Group;
  character: EnemyCharacterPresentation;
  threatMarker: THREE.Mesh;
  eliteMarker?: THREE.Mesh;
  body?: THREE.Mesh;
  shield?: THREE.Mesh;
  aura?: THREE.Mesh;
  leftWing?: THREE.Mesh;
  rightWing?: THREE.Mesh;
  mouth?: THREE.Mesh;
  drainRing?: THREE.Mesh;
  whistle?: THREE.Mesh;
  whistleRing?: THREE.Mesh;
  leftGlove?: THREE.Mesh;
  rightGlove?: THREE.Mesh;
  catchRing?: THREE.Mesh;
  weapon?: THREE.Mesh;
  specialRing?: THREE.Mesh;
}

export class RenderBridge {
  private readonly player: THREE.Group;
  private readonly playerAsset: PlayerCharacterAsset;
  private readonly ball: THREE.Mesh;
  private readonly ballMaterial: THREE.MeshStandardMaterial;
  private readonly ballLight: THREE.PointLight;
  private readonly trail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly trailPositions: Float32Array;
  private readonly bursts: HitBurst[];
  private readonly impactRings: ImpactRing[];
  private readonly signatureVfx: CombatVfxPool;
  private readonly surfaceEffects: PitchSurfaceEffects;
  private readonly goalNetResponse: GoalNetResponse;
  private readonly readabilityLight: CharacterReadabilityLight;
  private readonly enemies = new Map<number, EnemyVisual>();
  private readonly liveEnemyIds = new Set<number>();
  private readonly enemyProjectiles = new Map<number, THREE.Mesh>();
  private readonly liveEnemyProjectileIds = new Set<number>();
  private readonly pendingTechniqueContacts: number[] = [];
  private ballSpin = 0;
  private ballDeformation = 0;
  private trailInitialized = false;
  private nextBurst = 0;
  private nextImpactRing = 0;
  private burstSeed = 0x4b1d;
  private renderQuality: RenderQuality = 'balanced';
  private firstPerson = false;
  private reducedFlashes = false;
  private disposed = false;
  private previousMatchPhase?: GameState['phase'];

  constructor(private readonly scene: THREE.Scene) {
    activeBridgeCount += 1;
    const playerPresentation = createPlayer();
    this.player = playerPresentation.root;
    this.playerAsset = new PlayerCharacterAsset(playerPresentation.rig);
    this.playerAsset.load();
    this.ball = createBall();
    this.ballMaterial = this.ball.material as THREE.MeshStandardMaterial;
    const trail = createBallTrail();
    this.trail = trail.line;
    this.trailPositions = trail.positions;
    this.ballLight = new THREE.PointLight(0xff315d, 0, 5.5, 2);
    this.bursts = Array.from({ length: BURST_POOL_SIZE }, (_, index) => createHitBurst(index));
    this.impactRings = Array.from({ length: RING_POOL_SIZE }, (_, index) => createImpactRing(index));
    this.signatureVfx = new CombatVfxPool(scene);
    this.surfaceEffects = new PitchSurfaceEffects(scene);
    this.goalNetResponse = new GoalNetResponse(scene);
    this.readabilityLight = new CharacterReadabilityLight(scene);
    scene.add(this.player, this.trail, this.ball, this.ballLight);
    for (const burst of this.bursts) scene.add(burst.points);
    for (const ring of this.impactRings) scene.add(ring.mesh);
  }

  public setCharacter(characterId: CharacterId): void {
    this.playerAsset.setCharacter(characterId);
  }

  public setCharacterCustomization(appearance: Readonly<CustomCharacterAppearance>): void {
    this.playerAsset.setCustomization(appearance);
  }

  sync(state: GameState, ballPosition: Vec3, ballSpeed: number, dt: number, alpha: number): void {
    const p = state.player.position;
    const previousPlayer = state.player.previousPosition;
    this.player.position.set(
      THREE.MathUtils.lerp(previousPlayer.x, p.x, alpha),
      THREE.MathUtils.lerp(previousPlayer.y, p.y, alpha) - 0.9,
      THREE.MathUtils.lerp(previousPlayer.z, p.z, alpha),
    );
    this.player.rotation.y = state.player.facing;
    this.player.visible =
      !this.firstPerson &&
      (this.reducedFlashes ||
        !(state.player.invulnerability > 0 && Math.floor(state.player.invulnerability * 18) % 2 === 0));
    const importedPlayerReady = this.playerAsset.ready;
    if (importedPlayerReady) {
      this.playerAsset.update(dt, state.player);
      for (const contact of this.playerAsset.drainContactEvents()) {
        const intensity = this.pendingTechniqueContacts.shift();
        if (intensity === undefined) continue;
        if (contact.state === 'slideTackle') this.groundBurst(contact.position, intensity);
        else this.bootContactBurst(contact.position, intensity);
      }
    }
    if (importedPlayerReady && state.phase !== this.previousMatchPhase) {
      if (state.phase === 'won') this.playerAsset.playOutcome('victory');
      if (state.phase === 'dead') this.playerAsset.playOutcome('defeat');
      this.previousMatchPhase = state.phase;
    }

    this.ball.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    this.ballSpin += ballSpeed * dt * 1.6;
    this.ball.rotation.set(this.ballSpin, this.ballSpin * 0.35, 0);
    this.ballDeformation = Math.max(0, this.ballDeformation - dt * 4.8);
    const flightStretch = THREE.MathUtils.clamp((ballSpeed - 8) / 35, 0, 0.12);
    this.ball.scale.set(
      1 + this.ballDeformation * 0.16 - flightStretch * 0.45,
      1 - this.ballDeformation * 0.2 - flightStretch * 0.35,
      1 + this.ballDeformation * 0.06 + flightStretch,
    );
    this.updateBallEnergy(ballPosition, ballSpeed);
    this.updateBursts(dt);
    this.updateImpactRings(dt);
    this.signatureVfx.update(dt);
    this.surfaceEffects.sync(state.player, ballPosition, ballSpeed, dt);
    this.goalNetResponse.update(dt);
    this.readabilityLight.update(state.player.position);

    this.liveEnemyIds.clear();
    for (const enemy of state.enemies) {
      this.liveEnemyIds.add(enemy.id);
      let visual = this.enemies.get(enemy.id);
      if (!visual) {
        visual = createEnemy(enemy);
        this.enemies.set(enemy.id, visual);
        this.scene.add(visual.group);
      }
      const mesh = visual.group;
      const flightHeight =
        enemy.archetype === 'batSwarm' ? 0.62 + Math.sin(state.elapsed * 8 + enemy.id) * 0.16 : 0;
      mesh.position.set(
        THREE.MathUtils.lerp(enemy.previousPosition.x, enemy.position.x, alpha),
        flightHeight,
        THREE.MathUtils.lerp(enemy.previousPosition.z, enemy.position.z, alpha),
      );
      const useAttackFacing =
        enemy.archetype === 'winger' &&
        (enemy.attackState === 'telegraph' || enemy.attackState === 'lunge') &&
        (enemy.attackDirection.x !== 0 || enemy.attackDirection.z !== 0);
      const facingX = useAttackFacing ? enemy.attackDirection.x : p.x - mesh.position.x;
      const facingZ = useAttackFacing ? enemy.attackDirection.z : p.z - mesh.position.z;
      if (facingX !== 0 || facingZ !== 0) mesh.rotation.y = Math.atan2(facingX, facingZ);
      const pulse = enemy.hitFlash > 0 ? 1.28 : 1;
      const coachPulse = enemy.archetype === 'coach' ? 1 + Math.sin(state.elapsed * 5 + enemy.id) * 0.025 : 1;
      const telegraphPulse = enemy.attackState === 'telegraph' ? 1 + Math.sin(state.elapsed * 34) * 0.08 : 1;
      const buffPulse = enemy.buffed ? 1 + Math.sin(state.elapsed * 9 + enemy.id) * 0.025 : 1;
      const eliteScale = enemy.elite ? 1.18 : 1;
      mesh.scale.setScalar(pulse * coachPulse * telegraphPulse * buffPulse * eliteScale);
      const enemyDistanceSquared = (p.x - mesh.position.x) ** 2 + (p.z - mesh.position.z) ** 2;
      updateEnemyVisual(visual, enemy, state.elapsed, enemyDistanceSquared, this.renderQuality);
    }
    for (const [id, visual] of this.enemies) {
      if (this.liveEnemyIds.has(id)) continue;
      this.scene.remove(visual.group);
      this.enemies.delete(id);
    }
    this.liveEnemyProjectileIds.clear();
    for (const projectile of state.enemyProjectiles) {
      this.liveEnemyProjectileIds.add(projectile.id);
      let visual = this.enemyProjectiles.get(projectile.id);
      if (!visual) {
        visual = new THREE.Mesh(enemyGeometry.projectile, enemyMaterial.projectile);
        visual.name = `enemy-projectile-${projectile.id}`;
        visual.castShadow = false;
        this.enemyProjectiles.set(projectile.id, visual);
        this.scene.add(visual);
      }
      visual.position.set(
        THREE.MathUtils.lerp(projectile.previousPosition.x, projectile.position.x, alpha),
        projectile.position.y,
        THREE.MathUtils.lerp(projectile.previousPosition.z, projectile.position.z, alpha),
      );
      visual.rotation.x += dt * 8;
      visual.rotation.z += dt * 11;
    }
    for (const [id, visual] of this.enemyProjectiles) {
      if (this.liveEnemyProjectileIds.has(id)) continue;
      this.scene.remove(visual);
      this.enemyProjectiles.delete(id);
    }
  }

  reset(): void {
    this.previousMatchPhase = undefined;
    this.playerAsset.resetPresentation();
    for (const visual of this.enemies.values()) {
      this.scene.remove(visual.group);
    }
    this.enemies.clear();
    for (const visual of this.enemyProjectiles.values()) this.scene.remove(visual);
    this.enemyProjectiles.clear();
    this.trailInitialized = false;
    this.trail.visible = false;
    this.ballDeformation = 0;
    this.ball.scale.setScalar(1);
    this.signatureVfx.reset();
    this.surfaceEffects.reset();
    this.goalNetResponse.reset();
    this.pendingTechniqueContacts.length = 0;
    for (const burst of this.bursts) {
      burst.age = burst.duration;
      burst.points.visible = false;
    }
    for (const ring of this.impactRings) {
      ring.age = ring.duration;
      ring.mesh.visible = false;
    }
  }

  setFirstPerson(active: boolean): void {
    this.firstPerson = active;
  }

  setReducedFlashes(active: boolean): void {
    this.reducedFlashes = active;
    this.signatureVfx.setReducedFlashes(active);
  }

  setRenderQuality(quality: RenderQuality): void {
    this.renderQuality = quality;
    this.signatureVfx.setQuality(quality);
    this.surfaceEffects.setQuality(quality);
    this.readabilityLight.setQuality(quality);
  }

  playPlayerTechnique(
    technique: 'kick' | 'ground-pass' | 'lob-pass' | 'bicycle',
    contactIntensity = 1,
    fallbackPosition?: Vec3,
  ): void {
    this.playerAsset.playTechnique(technique);
    if (this.playerAsset.ready) {
      this.pendingTechniqueContacts.push(contactIntensity);
      if (this.pendingTechniqueContacts.length > 4) this.pendingTechniqueContacts.shift();
    } else if (fallbackPosition) {
      this.bootContactBurst(fallbackPosition, contactIntensity);
    }
  }

  playPlayerReaction(reaction: 'damage' | 'knockdown'): void {
    this.playerAsset.playReaction(reaction);
  }

  playPlayerOutcome(outcome: 'celebration' | 'victory' | 'defeat'): void {
    this.playerAsset.playOutcome(outcome);
  }

  /** Reuses a small particle pool; safe to call for every registered ball hit. */
  hitBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity, 0xff315d);
    this.signatureVfx.trigger('blood', position, intensity * 0.62);
  }

  /** Slightly brighter variant intended for a successful returning volley. */
  volleyBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.25, 0xffd66b);
    this.signatureVfx.trigger('volley', position, intensity);
  }

  lightningBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity, 0x66d9ff);
  }

  frostBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.15, 0xb9f2ff);
  }

  voidBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity, 0xb66cff);
  }

  /** Football-specific boot/ball contact accent with an accessible reduced-flash variant. */
  bootContactBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.1, 0xffd66b);
    this.startImpactRing(position, intensity, 0xffd66b, 0.25, 1.75);
    this.signatureVfx.trigger('kick', position, intensity);
    this.ballDeformation = Math.max(this.ballDeformation, THREE.MathUtils.clamp(intensity * 0.42, 0.25, 0.8));
  }

  /** Low, earthy feedback for dashes, tackles and hard landings. */
  groundBurst(position: Vec3, intensity = 1): void {
    this.startBurst(
      { x: position.x, y: Math.max(0.04, position.y), z: position.z },
      intensity * 0.72,
      0xc99562,
    );
    this.startImpactRing(position, intensity * 0.8, 0x9f6d45, 0.4, 2.25);
    this.signatureVfx.trigger('tackle', position, intensity);
    this.surfaceEffects.markTackle(position, this.player.rotation.y, intensity);
  }

  /** Larger but still bounded celebration grammar for goals and terminal rewards. */
  goalBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.35, 0xff315d);
    this.startImpactRing(position, intensity * 1.2, 0xff315d, 0.65, 3.8);
    if (this.renderQuality !== 'performance') this.startImpactRing(position, intensity, 0xffd66b, 0.3, 2.9);
    this.signatureVfx.trigger('goal', position, intensity);
    this.goalNetResponse.impact(position, intensity);
    this.ballDeformation = Math.max(this.ballDeformation, THREE.MathUtils.clamp(intensity * 0.55, 0.45, 1));
  }

  /** Rising restorative grammar for healing and life-steal events. */
  healBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 0.7, 0x74ffbb);
    this.startImpactRing(position, intensity * 0.75, 0x74ffbb, 0.3, 2.1);
    this.signatureVfx.trigger('heal', position, intensity);
  }

  /** Large bounded rune/beam accent for boss entrances, phases, and defeat. */
  bossBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.45, 0xb66cff);
    this.startImpactRing(position, intensity * 1.25, 0xb66cff, 0.75, 4.6);
    this.signatureVfx.trigger('boss', position, intensity);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.playerAsset.dispose();
    this.signatureVfx.dispose();
    this.surfaceEffects.dispose();
    this.goalNetResponse.dispose();
    this.readabilityLight.dispose();
    this.scene.remove(this.player, this.ball, this.trail, this.ballLight);
    this.ball.geometry.dispose();
    this.ballMaterial.dispose();
    this.trail.geometry.dispose();
    this.trail.material.dispose();
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
    }
    for (const ring of this.impactRings) {
      this.scene.remove(ring.mesh);
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
    }
    activeBridgeCount = Math.max(0, activeBridgeCount - 1);
    if (activeBridgeCount === 0) {
      disposeSharedRenderResources();
      disposeEnemyCharacterResources();
    }
  }

  private updateBallEnergy(position: Vec3, speed: number): void {
    const energy = THREE.MathUtils.clamp((speed - 3) / 31, 0, 1);
    this.ballMaterial.emissive.setRGB(0.32 * energy, 0.018 * energy, 0.065 * energy);
    this.ballMaterial.emissiveIntensity = 1 + energy * 1.8;
    this.ballLight.position.set(position.x, position.y, position.z);
    this.ballLight.intensity = energy * 1.65;

    if (!this.trailInitialized) {
      for (let index = 0; index < TRAIL_POINTS; index += 1) {
        const offset = index * 3;
        this.trailPositions[offset] = position.x;
        this.trailPositions[offset + 1] = position.y;
        this.trailPositions[offset + 2] = position.z;
      }
      this.trailInitialized = true;
    } else {
      this.trailPositions.copyWithin(0, 3);
      const tail = (TRAIL_POINTS - 1) * 3;
      this.trailPositions[tail] = position.x;
      this.trailPositions[tail + 1] = position.y;
      this.trailPositions[tail + 2] = position.z;
    }
    this.trail.geometry.attributes.position!.needsUpdate = true;
    this.trail.material.opacity = energy * 0.72;
    this.trail.visible = energy > 0.035;
  }

  private startBurst(position: Vec3, intensity: number, color: number): void {
    const burst = this.bursts[this.nextBurst]!;
    this.nextBurst = (this.nextBurst + 1) % this.bursts.length;
    const strength = Number.isFinite(intensity) ? THREE.MathUtils.clamp(intensity, 0.2, 2) : 1;
    burst.age = 0;
    burst.duration = this.reducedFlashes ? 0.14 : 0.22 + strength * 0.07;
    burst.points.position.set(position.x, position.y, position.z);
    burst.points.material.color.setHex(color);
    burst.points.material.opacity = this.reducedFlashes ? 0.45 : 0.9;
    burst.points.material.size = 0.13 + strength * 0.045;
    burst.points.visible = true;
    const particleCount =
      this.renderQuality === 'performance' ? 8 : this.renderQuality === 'quality' ? 14 : 11;
    burst.points.geometry.setDrawRange(0, particleCount);
    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      const angle = (index / particleCount) * Math.PI * 2 + this.nextRandom() * 0.28;
      const lift = 0.2 + this.nextRandom() * 0.75;
      const speed = (2.6 + this.nextRandom() * 3.6) * strength;
      burst.positions[offset] = 0;
      burst.positions[offset + 1] = 0;
      burst.positions[offset + 2] = 0;
      burst.velocities[offset] = Math.cos(angle) * speed;
      burst.velocities[offset + 1] = lift * speed;
      burst.velocities[offset + 2] = Math.sin(angle) * speed;
    }
    burst.points.geometry.attributes.position!.needsUpdate = true;
  }

  private startImpactRing(
    position: Vec3,
    intensity: number,
    color: number,
    startScale: number,
    endScale: number,
  ): void {
    const ring = this.impactRings[this.nextImpactRing]!;
    this.nextImpactRing = (this.nextImpactRing + 1) % this.impactRings.length;
    const strength = Number.isFinite(intensity) ? THREE.MathUtils.clamp(intensity, 0.25, 2) : 1;
    ring.age = 0;
    ring.duration = this.reducedFlashes ? 0.12 : 0.24 + strength * 0.06;
    ring.startScale = startScale * strength;
    ring.endScale = endScale * strength;
    ring.mesh.position.set(position.x, Math.max(0.05, position.y), position.z);
    ring.mesh.scale.setScalar(ring.startScale);
    ring.mesh.material.color.setHex(color);
    ring.mesh.material.opacity = this.reducedFlashes ? 0.3 : 0.78;
    ring.mesh.visible = true;
  }

  private updateImpactRings(dt: number): void {
    for (const ring of this.impactRings) {
      if (!ring.mesh.visible) continue;
      ring.age += dt;
      if (ring.age >= ring.duration) {
        ring.mesh.visible = false;
        continue;
      }
      const progress = ring.age / ring.duration;
      const scale = THREE.MathUtils.lerp(ring.startScale, ring.endScale, 1 - (1 - progress) ** 3);
      ring.mesh.scale.setScalar(scale);
      ring.mesh.material.opacity = (this.reducedFlashes ? 0.3 : 0.78) * (1 - progress);
    }
  }

  private nextRandom(): number {
    this.burstSeed = (Math.imul(this.burstSeed, 1664525) + 1013904223) >>> 0;
    return this.burstSeed / 0x1_0000_0000;
  }

  private updateBursts(dt: number): void {
    for (const burst of this.bursts) {
      if (!burst.points.visible) continue;
      burst.age += dt;
      if (burst.age >= burst.duration) {
        burst.points.visible = false;
        continue;
      }
      for (let offset = 0; offset < burst.positions.length; offset += 3) {
        burst.velocities[offset + 1]! -= 11 * dt;
        burst.positions[offset]! += burst.velocities[offset]! * dt;
        burst.positions[offset + 1]! += burst.velocities[offset + 1]! * dt;
        burst.positions[offset + 2]! += burst.velocities[offset + 2]! * dt;
      }
      burst.points.material.opacity = 0.9 * (1 - burst.age / burst.duration);
      burst.points.geometry.attributes.position!.needsUpdate = true;
    }
  }
}

function createBallTrail(): {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  positions: Float32Array;
} {
  const positions = new Float32Array(TRAIL_POINTS * 3);
  const colors = new Float32Array(TRAIL_POINTS * 3);
  for (let index = 0; index < TRAIL_POINTS; index += 1) {
    const energy = (index + 1) / TRAIL_POINTS;
    const offset = index * 3;
    colors[offset] = 0.62 + energy * 0.38;
    colors[offset + 1] = 0.025 + energy * 0.28;
    colors[offset + 2] = 0.12 + energy * 0.24;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.visible = false;
  return { line, positions };
}

function createHitBurst(index: number): HitBurst {
  const positions = new Float32Array(BURST_PARTICLES * 3);
  const velocities = new Float32Array(BURST_PARTICLES * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.PointsMaterial({
    color: 0xff315d,
    size: 0.16,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = `pooled-hit-burst-${index}`;
  points.frustumCulled = false;
  points.visible = false;
  return { points, positions, velocities, age: 1, duration: 1 };
}

function createImpactRing(index: number): ImpactRing {
  const geometry = new THREE.RingGeometry(0.78, 1, 36);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff315d,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `pooled-impact-ring-${index}`;
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  mesh.visible = false;
  return { mesh, age: 1, duration: 1, startScale: 1, endScale: 1 };
}

interface PlayerPresentation {
  readonly root: THREE.Group;
  readonly rig: VoxelHumanoid;
}

function createPlayer(): PlayerPresentation {
  const rig = createVoxelHumanoid({
    namePrefix: 'player',
    facialStyle: 'focused',
    accessories: { hair: 'crop', wristbands: true, shinGuards: true },
  });
  const group = new THREE.Group();
  group.name = 'player-striker';
  // VoxelHumanoid is authored facing +Z while gameplay-forward is local -Z.
  rig.root.rotation.y = Math.PI;
  group.add(rig.root);
  group.userData.visualStyle = 'original-block-football';
  group.userData.rigType = 'voxel-humanoid-v1';
  return { root: group, rig };
}

function createBall(): THREE.Mesh {
  return createFootballVisual();
}

function createEnemy(enemy: EnemyState): EnemyVisual {
  const group = new THREE.Group();
  const definition = getEnemyArchetypeDefinition(enemy.archetype);
  group.name = `enemy-${enemy.id}`;
  group.userData.enemyArchetype = enemy.archetype;
  group.userData.enemyRole = definition.role;
  group.userData.enemyDisplayName = definition.displayName;
  group.userData.enemyThreatLevel = definition.threatLevel;
  group.userData.enemySignature = definition.signature;
  const bodyRoot = new THREE.Group();
  bodyRoot.name = 'enemy-body-root';
  group.add(bodyRoot);

  const character = createEnemyCharacterPresentation(enemy.archetype);
  bodyRoot.add(character.lodRoot);
  const parts: Partial<EnemyVisual> = {
    shield: character.shield,
    aura: character.aura,
    leftWing: character.leftWing,
    rightWing: character.rightWing,
    mouth: character.mouth,
    drainRing: character.drainRing,
    whistle: character.whistle,
    whistleRing: character.whistleRing,
    leftGlove: character.leftGlove,
    rightGlove: character.rightGlove,
    catchRing: character.catchRing,
    weapon: character.weapon,
    specialRing: character.specialRing,
  };

  // Ground-space cues must not inherit body lean or hit recoil.
  for (const groundCue of [parts.aura, parts.drainRing, parts.whistleRing, parts.specialRing]) {
    if (!groundCue) continue;
    bodyRoot.remove(groundCue);
    group.add(groundCue);
  }

  return {
    ...parts,
    group,
    bodyRoot,
    character,
    threatMarker: addThreatMarker(group),
    eliteMarker: enemy.elite ? addEliteMarker(group) : undefined,
  };
}

function updateEnemyVisual(
  visual: EnemyVisual,
  enemy: EnemyState,
  elapsed: number,
  distanceSquared: number,
  quality: RenderQuality,
): void {
  const phase = elapsed + enemy.id * 0.37;
  const dx = enemy.position.x - enemy.previousPosition.x;
  const dz = enemy.position.z - enemy.previousPosition.z;
  const moving = dx * dx + dz * dz > 0.000001;
  const lod = chooseEnemyVisualLod(distanceSquared, quality);
  if (lod !== visual.character.lod) setEnemyVisualLod(visual.character, lod);
  updateEnemyCharacterPose(
    visual.character,
    elapsed,
    enemy.id,
    moving,
    enemy.attackState,
    enemy.hitFlash > 0,
  );
  const slowFactor = enemy.slowTimer > 0 ? 0.55 : 1;
  const gait = Math.sin(phase * (enemy.buffed ? 11 : 7) * slowFactor);
  const step = moving ? Math.abs(gait) : Math.abs(Math.sin(phase * 2.2)) * 0.18;
  let lean = moving ? 0.045 : 0;
  let sway = moving ? gait * 0.035 : Math.sin(phase * 1.8) * 0.012;

  if (enemy.attackState === 'telegraph') lean = -0.12;
  else if (enemy.attackState === 'lunge' || enemy.attackState === 'drain') lean = 0.28;
  else if (enemy.attackState === 'whistle') lean = 0.14;
  else if (enemy.attackState === 'volley') lean = 0.2;
  else if (enemy.attackState === 'vanish') lean = -0.28;
  else if (enemy.attackState === 'fuse') lean = 0.08;
  else if (enemy.attackState === 'recover') lean = -0.08;
  if (enemy.hitFlash > 0) {
    lean = -0.2;
    sway *= 2;
  }

  visual.bodyRoot.position.y = enemy.archetype === 'batSwarm' ? 0 : step * 0.055;
  visual.bodyRoot.rotation.set(lean, 0, sway);

  const marker = visual.threatMarker;
  marker.visible =
    enemy.attackState === 'telegraph' ||
    enemy.attackState === 'drain' ||
    enemy.attackState === 'whistle' ||
    enemy.attackState === 'vanish' ||
    enemy.attackState === 'fuse';
  marker.position.y = 2.3 + Math.sin(elapsed * 13 + enemy.id) * 0.12;
  marker.rotation.y = elapsed * 7 + enemy.id;
  marker.rotation.z = -elapsed * 4 - enemy.id * 0.5;
  marker.scale.setScalar(enemy.attackState === 'whistle' ? 1.55 : 1);

  if (visual.eliteMarker) {
    visual.eliteMarker.rotation.z = elapsed * 1.5 + enemy.id;
    visual.eliteMarker.scale.setScalar(1 + Math.sin(elapsed * 5 + enemy.id) * 0.08);
  }

  if (visual.shield) {
    const shieldPulse = enemy.shieldFlash > 0 ? 1.18 + Math.sin(elapsed * 48) * 0.08 : 1;
    visual.shield.scale.set(shieldPulse, shieldPulse, enemy.shieldFlash > 0 ? 1.65 : 1);
    visual.shield.position.z = enemy.shieldFlash > 0 ? 0.31 : 0.42;
  }

  if (visual.aura) {
    visual.aura.rotation.z = elapsed * 0.32;
    visual.aura.scale.setScalar(1 + Math.sin(elapsed * 4 + enemy.id) * 0.025);
  }

  if (visual.leftWing && visual.rightWing) {
    let wingBase = 0.72;
    let wingMotion = Math.sin(elapsed * 18 + enemy.id) * 0.34;
    if (enemy.archetype === 'winger') {
      wingMotion = Math.sin(elapsed * 12 + enemy.id) * 0.12;
      if (enemy.attackState === 'telegraph') wingBase = 1.08;
      else if (enemy.attackState === 'lunge') wingBase = 0.28;
      else if (enemy.attackState === 'recover') wingBase = 0.52;
    }
    visual.leftWing.rotation.z = -wingBase - wingMotion;
    visual.rightWing.rotation.z = wingBase + wingMotion;
  }

  if (visual.drainRing) {
    const draining = enemy.attackState === 'drain';
    visual.drainRing.visible = draining;
    visual.drainRing.scale.setScalar(1 + Math.sin(elapsed * 30) * 0.16);
    visual.drainRing.rotation.z = elapsed * 2.8;
    visual.mouth?.scale.setScalar(draining ? 1.35 + Math.sin(elapsed * 24) * 0.1 : 1);
  }

  if (visual.whistleRing) {
    const signalling = enemy.attackState === 'telegraph' || enemy.attackState === 'whistle';
    visual.whistleRing.visible = signalling;
    const whistlePulse = enemy.attackState === 'whistle' ? 1.8 : 1 + Math.sin(elapsed * 24) * 0.12;
    visual.whistleRing.scale.setScalar(whistlePulse);
    visual.whistleRing.rotation.z = elapsed * 1.8;
    if (visual.whistle) {
      visual.whistle.position.y = enemy.attackState === 'telegraph' ? 1.58 : 1.42;
      visual.whistle.position.z = enemy.attackState === 'whistle' ? 0.52 : 0.39;
    }
  }

  if (visual.catchRing && visual.leftGlove && visual.rightGlove) {
    const catching = enemy.shieldFlash > 0;
    visual.catchRing.visible = catching;
    visual.catchRing.scale.setScalar(1 + Math.sin(elapsed * 42) * 0.12);
    const gloveInset = catching ? 0.3 : 0;
    const gloveForward = catching ? 0.24 : 0;
    visual.leftGlove.position.set(-0.92 + gloveInset, 1.02, 0.28 + gloveForward);
    visual.rightGlove.position.set(0.92 - gloveInset, 1.02, 0.28 + gloveForward);
  }
  if (visual.weapon && enemy.archetype === 'bloodArcher') {
    visual.weapon.rotation.z = enemy.attackState === 'telegraph' ? -0.5 : -0.15;
    visual.weapon.scale.setScalar(enemy.attackState === 'volley' ? 1.25 : 1);
  }
  if (visual.specialRing) {
    const active = enemy.attackState === 'vanish' || enemy.attackState === 'fuse';
    visual.specialRing.visible = active;
    visual.specialRing.rotation.z = elapsed * (enemy.archetype === 'corpseBomber' ? 3.8 : -2.5);
    visual.specialRing.scale.setScalar(
      enemy.archetype === 'corpseBomber'
        ? 1 + Math.max(0, Math.sin(elapsed * 18)) * 0.35
        : 1 + Math.sin(elapsed * 12) * 0.12,
    );
    if (enemy.archetype === 'shadowRunner') visual.bodyRoot.scale.setScalar(active ? 0.72 : 1);
  }
}

const enemyGeometry = {
  projectile: voxelFootballPropGeometry('bloodBolt').clone(),
  threatMarker: new THREE.OctahedronGeometry(0.16, 0),
  eliteMarker: new THREE.TorusGeometry(0.72, 0.055, 5, 20),
};

const enemyMaterial = {
  projectile: new THREE.MeshBasicMaterial({ color: 0xff315d }),
  threatMarker: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  elite: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  }),
};

function disposeSharedRenderResources(): void {
  for (const geometry of Object.values(enemyGeometry)) geometry.dispose();
  for (const material of Object.values(enemyMaterial)) material.dispose();
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  y: number,
  name?: string,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  if (name) result.name = name;
  result.position.y = y;
  result.castShadow = true;
  return result;
}

function addEliteMarker(group: THREE.Group): THREE.Mesh {
  const marker = mesh(enemyGeometry.eliteMarker, enemyMaterial.elite, 2.25, 'elite-marker');
  marker.name = 'elite-marker';
  marker.rotation.x = Math.PI / 2;
  marker.castShadow = false;
  group.add(marker);
  return marker;
}

function addThreatMarker(group: THREE.Group): THREE.Mesh {
  const marker = mesh(enemyGeometry.threatMarker, enemyMaterial.threatMarker, 2.3, 'enemy-threat-marker');
  marker.name = 'enemy-threat-marker';
  marker.rotation.set(Math.PI / 4, 0, Math.PI / 4);
  marker.castShadow = false;
  marker.visible = false;
  group.add(marker);
  return marker;
}
