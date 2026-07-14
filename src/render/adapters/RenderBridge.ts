import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EnemyState, GameState, Vec3 } from '../../game/simulation/types';
import { getEnemyArchetypeDefinition } from '../../game/simulation/enemyArchetypes';
import { CHARACTER_DEFINITIONS, type CharacterId } from '../../game/characters';
import { PlayerCharacterAsset } from '../objects/PlayerCharacterAsset';

const TRAIL_POINTS = 16;
const BURST_POOL_SIZE = 4;
const BURST_PARTICLES = 14;
let activeBridgeCount = 0;

interface HitBurst {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  positions: Float32Array;
  velocities: Float32Array;
  age: number;
  duration: number;
}

interface EnemyVisual {
  group: THREE.Group;
  bodyRoot: THREE.Group;
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
  private readonly enemies = new Map<number, EnemyVisual>();
  private readonly liveEnemyIds = new Set<number>();
  private readonly enemyProjectiles = new Map<number, THREE.Mesh>();
  private readonly liveEnemyProjectileIds = new Set<number>();
  private ballSpin = 0;
  private trailInitialized = false;
  private nextBurst = 0;
  private firstPerson = false;
  private reducedFlashes = false;
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {
    activeBridgeCount += 1;
    this.player = createPlayer();
    this.playerAsset = new PlayerCharacterAsset(this.player);
    this.playerAsset.load();
    this.ball = createBall();
    this.ballMaterial = this.ball.material as THREE.MeshStandardMaterial;
    const trail = createBallTrail();
    this.trail = trail.line;
    this.trailPositions = trail.positions;
    this.ballLight = new THREE.PointLight(0xff315d, 0, 5.5, 2);
    this.bursts = Array.from({ length: BURST_POOL_SIZE }, (_, index) => createHitBurst(index));
    scene.add(this.player, this.trail, this.ball, this.ballLight);
    for (const burst of this.bursts) scene.add(burst.points);
  }

  public setCharacter(characterId: CharacterId): void {
    const style = CHARACTER_DEFINITIONS[characterId].visualStyle;
    playerMaterial.jersey.color.setHex(style.primaryColor);
    playerMaterial.crimson.color.setHex(style.accentColor);
    playerMaterial.sole.color.setHex(style.bootColor);
    for (const id of Object.keys(CHARACTER_DEFINITIONS) as CharacterId[]) {
      const accessory = this.player.getObjectByName(`player-accessory-${id}`);
      if (accessory) accessory.visible = id === characterId;
    }
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
    if (this.playerAsset.ready) this.playerAsset.update(dt, state.player);
    else animatePlayer(this.player, state.elapsed, previousPlayer, p);

    this.ball.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    this.ballSpin += ballSpeed * dt * 1.6;
    this.ball.rotation.set(this.ballSpin, this.ballSpin * 0.35, 0);
    this.updateBallEnergy(ballPosition, ballSpeed);
    this.updateBursts(dt);

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
      updateEnemyVisual(visual, enemy, state.elapsed);
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
    for (const visual of this.enemies.values()) {
      this.scene.remove(visual.group);
    }
    this.enemies.clear();
    for (const visual of this.enemyProjectiles.values()) this.scene.remove(visual);
    this.enemyProjectiles.clear();
    this.trailInitialized = false;
    this.trail.visible = false;
    for (const burst of this.bursts) {
      burst.age = burst.duration;
      burst.points.visible = false;
    }
  }

  setFirstPerson(active: boolean): void {
    this.firstPerson = active;
  }

  setReducedFlashes(active: boolean): void {
    this.reducedFlashes = active;
  }

  playPlayerTechnique(technique: 'kick' | 'bicycle'): void {
    this.playerAsset.playTechnique(technique);
  }

  /** Reuses a small particle pool; safe to call for every registered ball hit. */
  hitBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity, 0xff315d);
  }

  /** Slightly brighter variant intended for a successful returning volley. */
  volleyBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.25, 0xffd66b);
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

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.playerAsset.dispose();
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
    activeBridgeCount = Math.max(0, activeBridgeCount - 1);
    if (activeBridgeCount === 0) disposeSharedRenderResources();
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
    for (let index = 0; index < BURST_PARTICLES; index += 1) {
      const offset = index * 3;
      const angle = (index / BURST_PARTICLES) * Math.PI * 2 + Math.random() * 0.28;
      const lift = 0.2 + Math.random() * 0.75;
      const speed = (2.6 + Math.random() * 3.6) * strength;
      burst.positions[offset] = 0;
      burst.positions[offset + 1] = 0;
      burst.positions[offset + 2] = 0;
      burst.velocities[offset] = Math.cos(angle) * speed;
      burst.velocities[offset + 1] = lift * speed;
      burst.velocities[offset + 2] = Math.sin(angle) * speed;
    }
    burst.points.geometry.attributes.position!.needsUpdate = true;
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

const playerGeometry = {
  torso: new THREE.CapsuleGeometry(0.38, 0.46, 4, 12),
  sash: new THREE.BoxGeometry(0.115, 0.76, 0.032, 1, 3, 1),
  collar: new THREE.TorusGeometry(0.2, 0.035, 6, 18, Math.PI * 1.55),
  shorts: new THREE.CapsuleGeometry(0.34, 0.12, 3, 10),
  head: new THREE.SphereGeometry(0.29, 16, 12),
  hair: new THREE.SphereGeometry(0.298, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.46),
  ear: new THREE.SphereGeometry(0.06, 8, 6),
  nose: new THREE.ConeGeometry(0.045, 0.11, 8),
  eye: new THREE.SphereGeometry(0.034, 8, 6),
  brow: new THREE.BoxGeometry(0.095, 0.025, 0.022),
  arm: new THREE.CapsuleGeometry(0.105, 0.47, 4, 8),
  cuff: new THREE.CylinderGeometry(0.12, 0.11, 0.12, 10),
  hand: new THREE.SphereGeometry(0.12, 10, 8),
  leg: new THREE.CapsuleGeometry(0.125, 0.43, 4, 8),
  sock: new THREE.CapsuleGeometry(0.135, 0.26, 3, 8),
  supportBoot: new THREE.CapsuleGeometry(0.16, 0.22, 3, 8),
  bootUpper: new THREE.CapsuleGeometry(0.25, 0.4, 4, 10),
  bootToe: new THREE.SphereGeometry(0.3, 12, 8),
  bootSole: new THREE.BoxGeometry(0.54, 0.085, 1.06, 2, 1, 4),
  stud: new THREE.CylinderGeometry(0.035, 0.045, 0.055, 7),
  badge: new THREE.CircleGeometry(0.085, 12),
  maestroScarf: new THREE.BoxGeometry(0.17, 0.85, 0.06),
  breakawayFin: new THREE.ConeGeometry(0.12, 0.58, 4),
  towerPad: new THREE.BoxGeometry(0.42, 0.2, 0.54),
  finisherCollar: new THREE.TorusGeometry(0.36, 0.055, 5, 16),
  engineRing: new THREE.TorusGeometry(0.58, 0.045, 5, 20),
  guardianPlate: new THREE.BoxGeometry(0.72, 0.54, 0.08),
};

const playerMaterial = {
  jersey: new THREE.MeshStandardMaterial({ color: 0xe1ded0, roughness: 0.72 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc8b9ae, roughness: 0.82 }),
  shorts: new THREE.MeshStandardMaterial({ color: 0x251a30, roughness: 0.84 }),
  crimson: new THREE.MeshStandardMaterial({ color: 0xb5123f, roughness: 0.4, metalness: 0.12 }),
  sole: new THREE.MeshStandardMaterial({ color: 0x4b1029, roughness: 0.7 }),
  eyes: new THREE.MeshBasicMaterial({ color: 0xffd66b }),
  hair: new THREE.MeshStandardMaterial({ color: 0x170d1d, roughness: 0.9 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.66 }),
};

function playerMesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = true;
  return result;
}

function createPlayer(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'player-striker';

  const torso = playerMesh(playerGeometry.torso, playerMaterial.jersey, 'player-torso');
  torso.position.y = 1.2;

  const sash = playerMesh(playerGeometry.sash, playerMaterial.crimson, 'player-sash');
  sash.position.set(0.12, 1.22, -0.37);
  sash.rotation.z = -0.25;
  sash.castShadow = false;

  const collar = playerMesh(playerGeometry.collar, playerMaterial.crimson, 'player-collar');
  collar.position.set(0, 1.61, -0.04);
  collar.rotation.x = Math.PI / 2;

  const badge = playerMesh(playerGeometry.badge, playerMaterial.crimson, 'player-club-badge');
  badge.position.set(-0.19, 1.37, -0.355);
  badge.rotation.y = Math.PI;
  badge.castShadow = false;

  const shorts = playerMesh(playerGeometry.shorts, playerMaterial.shorts, 'player-shorts');
  shorts.position.y = 0.72;

  const head = playerMesh(playerGeometry.head, playerMaterial.skin, 'player-head');
  head.position.y = 1.9;
  const hair = playerMesh(playerGeometry.hair, playerMaterial.hair, 'player-hair');
  hair.position.set(0, 1.925, 0.005);
  for (const side of [-1, 1]) {
    const ear = playerMesh(
      playerGeometry.ear,
      playerMaterial.skin,
      `player-ear-${side < 0 ? 'left' : 'right'}`,
    );
    ear.position.set(side * 0.285, 1.9, 0);
    group.add(ear);
    const eye = playerMesh(
      playerGeometry.eye,
      playerMaterial.eyes,
      `player-eye-${side < 0 ? 'left' : 'right'}`,
    );
    eye.position.set(side * 0.105, 1.96, -0.267);
    eye.castShadow = false;
    group.add(eye);
    const brow = playerMesh(
      playerGeometry.brow,
      playerMaterial.hair,
      `player-brow-${side < 0 ? 'left' : 'right'}`,
    );
    brow.position.set(side * 0.105, 2.04, -0.273);
    brow.rotation.z = side * -0.08;
    group.add(brow);
  }
  const nose = playerMesh(playerGeometry.nose, playerMaterial.skin, 'player-nose');
  nose.position.set(0, 1.91, -0.31);
  nose.rotation.x = -Math.PI / 2;

  const leftArm = playerMesh(playerGeometry.arm, playerMaterial.jersey, 'player-arm-left');
  leftArm.position.set(-0.53, 1.18, 0);
  leftArm.rotation.z = -0.18;
  const leftCuff = playerMesh(playerGeometry.cuff, playerMaterial.crimson, 'player-cuff-left');
  leftCuff.position.set(-0.58, 0.91, 0);
  const leftHand = playerMesh(playerGeometry.hand, playerMaterial.skin, 'player-hand-left');
  leftHand.position.set(-0.61, 0.76, -0.015);
  const rightArm = playerMesh(playerGeometry.arm, playerMaterial.jersey, 'player-arm-right');
  rightArm.position.set(0.53, 1.18, 0);
  rightArm.rotation.z = 0.18;
  const rightCuff = playerMesh(playerGeometry.cuff, playerMaterial.crimson, 'player-cuff-right');
  rightCuff.position.set(0.58, 0.91, 0);
  const rightHand = playerMesh(playerGeometry.hand, playerMaterial.skin, 'player-hand-right');
  rightHand.position.set(0.61, 0.76, -0.015);

  const supportLeg = playerMesh(playerGeometry.leg, playerMaterial.skin, 'player-support-leg');
  supportLeg.position.set(-0.2, 0.39, 0.05);
  const supportSock = playerMesh(playerGeometry.sock, playerMaterial.white, 'player-support-sock');
  supportSock.position.set(-0.2, 0.32, 0.03);
  const supportBoot = playerMesh(playerGeometry.supportBoot, playerMaterial.sole, 'player-support-boot');
  supportBoot.position.set(-0.2, 0.11, -0.18);
  supportBoot.rotation.x = Math.PI / 2;

  const kickingLeg = playerMesh(playerGeometry.leg, playerMaterial.skin, 'player-kicking-leg');
  kickingLeg.position.set(0.2, 0.46, -0.23);
  kickingLeg.rotation.x = -0.5;
  const kickingSock = playerMesh(playerGeometry.sock, playerMaterial.white, 'player-kicking-sock');
  kickingSock.position.set(0.2, 0.36, -0.39);
  kickingSock.rotation.x = -0.35;

  // Local -Z is gameplay-forward. The layered upper, toe and sole keep the
  // signature boot readable from both the chase camera and lateral angles.
  const bootUpper = playerMesh(playerGeometry.bootUpper, playerMaterial.crimson, 'player-crimson-boot');
  bootUpper.position.set(0.2, 0.25, -0.75);
  bootUpper.rotation.x = Math.PI / 2 - 0.09;
  const bootToe = playerMesh(playerGeometry.bootToe, playerMaterial.crimson, 'player-crimson-boot-toe');
  bootToe.position.set(0.2, 0.23, -1.15);
  bootToe.scale.set(1.05, 0.58, 1.08);
  const bootSole = playerMesh(playerGeometry.bootSole, playerMaterial.sole, 'player-crimson-boot-sole');
  bootSole.position.set(0.2, 0.085, -0.83);

  const studs: THREE.Mesh[] = [];
  for (const x of [-0.17, 0.17]) {
    for (const z of [-1.12, -0.63]) {
      const stud = playerMesh(
        playerGeometry.stud,
        playerMaterial.sole,
        `player-boot-stud-${studs.length + 1}`,
      );
      stud.position.set(0.2 + x, 0.01, z);
      studs.push(stud);
    }
  }

  group.add(
    torso,
    sash,
    collar,
    badge,
    shorts,
    head,
    hair,
    nose,
    leftArm,
    leftCuff,
    leftHand,
    rightArm,
    rightCuff,
    rightHand,
    supportLeg,
    supportSock,
    supportBoot,
    kickingLeg,
    kickingSock,
    bootUpper,
    bootToe,
    bootSole,
    ...studs,
  );
  addCharacterAccessories(group);
  return group;
}

function addCharacterAccessories(group: THREE.Group): void {
  const maestro = playerMesh(playerGeometry.maestroScarf, playerMaterial.crimson, 'player-accessory-maestro');
  maestro.position.set(-0.25, 1.38, 0.34);
  maestro.rotation.z = 0.42;

  const breakaway = new THREE.Group();
  breakaway.name = 'player-accessory-breakaway';
  for (const side of [-1, 1]) {
    const fin = playerMesh(playerGeometry.breakawayFin, playerMaterial.crimson, 'breakaway-speed-fin');
    fin.position.set(side * 0.4, 0.2, 0.25);
    fin.rotation.z = side * 0.62;
    breakaway.add(fin);
  }

  const tower = new THREE.Group();
  tower.name = 'player-accessory-tower';
  for (const side of [-1, 1]) {
    const pad = playerMesh(playerGeometry.towerPad, playerMaterial.crimson, 'tower-shoulder-pad');
    pad.position.set(side * 0.62, 1.5, 0);
    tower.add(pad);
  }

  const finisher = playerMesh(
    playerGeometry.finisherCollar,
    playerMaterial.crimson,
    'player-accessory-finisher',
  );
  finisher.position.y = 1.65;
  finisher.rotation.x = Math.PI / 2;

  const engine = playerMesh(playerGeometry.engineRing, playerMaterial.crimson, 'player-accessory-engine');
  engine.position.y = 0.08;
  engine.rotation.x = -Math.PI / 2;

  const guardian = playerMesh(
    playerGeometry.guardianPlate,
    playerMaterial.crimson,
    'player-accessory-guardian',
  );
  guardian.position.set(0, 1.18, -0.44);

  for (const accessory of [maestro, breakaway, tower, finisher, engine, guardian]) accessory.visible = false;
  group.add(maestro, breakaway, tower, finisher, engine, guardian);
}

function animatePlayer(group: THREE.Group, elapsed: number, previous: Vec3, current: Vec3): void {
  const moving = (current.x - previous.x) ** 2 + (current.z - previous.z) ** 2 > 0.000001;
  const stride = moving ? Math.sin(elapsed * 11) : Math.sin(elapsed * 2.4) * 0.08;
  const leftArm = group.getObjectByName('player-arm-left');
  const rightArm = group.getObjectByName('player-arm-right');
  const supportLeg = group.getObjectByName('player-support-leg');
  const kickingLeg = group.getObjectByName('player-kicking-leg');
  const torso = group.getObjectByName('player-torso');
  const head = group.getObjectByName('player-head');
  if (leftArm) leftArm.rotation.x = stride * 0.42;
  if (rightArm) rightArm.rotation.x = -stride * 0.42;
  if (supportLeg) supportLeg.rotation.x = -stride * 0.28;
  if (kickingLeg) kickingLeg.rotation.x = -0.5 + stride * 0.22;
  if (torso) {
    torso.rotation.z = moving ? stride * 0.025 : 0;
    torso.scale.y = 1 + Math.sin(elapsed * 2.4) * 0.012;
  }
  if (head) head.rotation.y = Math.sin(elapsed * 1.25) * (moving ? 0.025 : 0.06);
  const engine = group.getObjectByName('player-accessory-engine');
  if (engine) engine.rotation.z = elapsed * 1.8;
  const scarf = group.getObjectByName('player-accessory-maestro');
  if (scarf) scarf.rotation.x = Math.sin(elapsed * 5) * 0.16;
}

function createBall(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.38, metalness: 0.08 });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), material);
  mesh.castShadow = true;
  return mesh;
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

  const parts: Partial<EnemyVisual> = {};
  if (enemy.archetype === 'winger') addWinger(bodyRoot, parts);
  else if (enemy.archetype === 'defender') addDefender(bodyRoot, parts);
  else if (enemy.archetype === 'coach') addCoach(bodyRoot, parts);
  else if (enemy.archetype === 'batSwarm') addBatSwarm(bodyRoot, parts);
  else if (enemy.archetype === 'leechStriker') addLeechStriker(bodyRoot, parts);
  else if (enemy.archetype === 'corruptReferee') addCorruptReferee(bodyRoot, parts);
  else if (enemy.archetype === 'bloodArcher') addBloodArcher(bodyRoot, parts);
  else if (enemy.archetype === 'shadowRunner') addShadowRunner(bodyRoot, parts);
  else if (enemy.archetype === 'corpseBomber') addCorpseBomber(bodyRoot, parts);
  else if (enemy.archetype === 'goalkeeperBrute') addGoalkeeperBrute(bodyRoot, parts);
  else addBloodFan(bodyRoot, parts);

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
    threatMarker: addThreatMarker(group),
    eliteMarker: enemy.elite ? addEliteMarker(group) : undefined,
  };
}

function updateEnemyVisual(visual: EnemyVisual, enemy: EnemyState, elapsed: number): void {
  const phase = elapsed + enemy.id * 0.37;
  const dx = enemy.position.x - enemy.previousPosition.x;
  const dz = enemy.position.z - enemy.previousPosition.z;
  const moving = dx * dx + dz * dz > 0.000001;
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

function mergeEnemyParts(
  parts: Array<{ geometry: THREE.BufferGeometry; position: readonly [number, number, number] }>,
) {
  const geometries = parts.map(({ geometry, position }) => {
    geometry.translate(position[0], position[1], position[2]);
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) throw new Error('Could not merge shared enemy geometry');
  return merged;
}

const enemyGeometry = {
  fanCloak: new THREE.ConeGeometry(0.52, 1.45, 7),
  fanHead: new THREE.SphereGeometry(0.3, 10, 7),
  eyes: new THREE.BoxGeometry(0.3, 0.045, 0.045),
  wingerBody: new THREE.CapsuleGeometry(0.3, 0.82, 4, 7),
  wingerWing: new THREE.ConeGeometry(0.2, 0.9, 3),
  defenderBody: new THREE.BoxGeometry(0.95, 1.35, 0.62),
  defenderShield: new THREE.BoxGeometry(1.18, 1.05, 0.18),
  coachBody: new THREE.CylinderGeometry(0.38, 0.58, 1.55, 8),
  coachAura: new THREE.RingGeometry(5.3, 5.5, 40),
  batBody: new THREE.SphereGeometry(0.25, 7, 5),
  batWing: new THREE.ConeGeometry(0.3, 0.7, 3),
  batEars: mergeEnemyParts([
    { geometry: new THREE.ConeGeometry(0.07, 0.22, 4), position: [-0.1, 1.02, 0] },
    { geometry: new THREE.ConeGeometry(0.07, 0.22, 4), position: [0.1, 1.02, 0] },
  ]),
  leechBody: new THREE.CapsuleGeometry(0.38, 0.72, 4, 7),
  leechMouth: new THREE.TorusGeometry(0.2, 0.07, 5, 12),
  leechDrainRing: new THREE.TorusGeometry(0.62, 0.045, 5, 18),
  refereeBody: new THREE.BoxGeometry(0.7, 1.35, 0.46),
  refereeStripes: mergeEnemyParts(
    [-0.22, 0, 0.22].map((x) => ({
      geometry: new THREE.BoxGeometry(0.13, 1.2, 0.03),
      position: [x, 0.78, 0.245] as const,
    })),
  ),
  refereeWhistle: new THREE.ConeGeometry(0.1, 0.26, 5),
  refereeWhistleRing: new THREE.TorusGeometry(0.74, 0.055, 5, 20),
  bruteBody: new THREE.BoxGeometry(1.45, 1.65, 0.82),
  bruteGlove: new THREE.SphereGeometry(0.34, 8, 6),
  bruteCatchRing: new THREE.TorusGeometry(1.02, 0.07, 6, 24),
  archerBody: new THREE.CylinderGeometry(0.32, 0.46, 1.42, 7),
  archerBow: new THREE.TorusGeometry(0.52, 0.055, 5, 14, Math.PI * 1.35),
  shadowBody: new THREE.CapsuleGeometry(0.28, 0.9, 4, 7),
  shadowVeil: new THREE.ConeGeometry(0.52, 1.2, 5, 1, true),
  shadowRing: new THREE.RingGeometry(0.7, 0.85, 20),
  bomberBody: new THREE.DodecahedronGeometry(0.7, 0),
  bomberFuse: new THREE.CylinderGeometry(0.045, 0.045, 0.5, 5),
  bomberRing: new THREE.RingGeometry(1.35, 1.5, 24),
  projectile: new THREE.OctahedronGeometry(0.22, 0),
  threatMarker: new THREE.OctahedronGeometry(0.16, 0),
  eliteMarker: new THREE.TorusGeometry(0.72, 0.055, 5, 20),
};

const enemyMaterial = {
  pale: new THREE.MeshStandardMaterial({ color: 0xb9a6ae, roughness: 0.85 }),
  eyes: new THREE.MeshBasicMaterial({ color: 0xff174f }),
  fan: new THREE.MeshStandardMaterial({ color: 0x4a1d43, roughness: 0.72 }),
  winger: new THREE.MeshStandardMaterial({ color: 0x8e143e, roughness: 0.56 }),
  wingerWing: new THREE.MeshStandardMaterial({ color: 0xdd315d, roughness: 0.5 }),
  defender: new THREE.MeshStandardMaterial({ color: 0x46245e, roughness: 0.8 }),
  shield: new THREE.MeshStandardMaterial({ color: 0x74426e, roughness: 0.48, metalness: 0.28 }),
  coach: new THREE.MeshStandardMaterial({ color: 0xb89526, roughness: 0.58 }),
  bat: new THREE.MeshStandardMaterial({ color: 0x2c1c38, roughness: 0.78 }),
  batWing: new THREE.MeshStandardMaterial({ color: 0x84285e, roughness: 0.66, side: THREE.DoubleSide }),
  leech: new THREE.MeshStandardMaterial({ color: 0x62214c, roughness: 0.72 }),
  leechMouth: new THREE.MeshBasicMaterial({ color: 0xf2b5cf }),
  leechDrain: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  }),
  referee: new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.78 }),
  refereeStripe: new THREE.MeshStandardMaterial({ color: 0x16131a, roughness: 0.84 }),
  refereeWhistle: new THREE.MeshStandardMaterial({ color: 0xffcf40, roughness: 0.3, metalness: 0.58 }),
  refereeRing: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  }),
  brute: new THREE.MeshStandardMaterial({ color: 0x38264f, roughness: 0.76 }),
  bruteGlove: new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.58 }),
  bruteCatch: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  }),
  archer: new THREE.MeshStandardMaterial({ color: 0x6e173a, roughness: 0.62 }),
  archerBow: new THREE.MeshStandardMaterial({ color: 0xd6a632, roughness: 0.35, metalness: 0.4 }),
  shadow: new THREE.MeshStandardMaterial({ color: 0x171328, roughness: 0.78 }),
  shadowVeil: new THREE.MeshBasicMaterial({
    color: 0x7b58bc,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }),
  bomber: new THREE.MeshStandardMaterial({ color: 0x6d3428, roughness: 0.7 }),
  bomberFuse: new THREE.MeshBasicMaterial({ color: 0xffcf40 }),
  dangerRing: new THREE.MeshBasicMaterial({
    color: 0xff6a3d,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  projectile: new THREE.MeshBasicMaterial({ color: 0xff315d }),
  threatMarker: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  aura: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  elite: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  }),
};

function disposeSharedRenderResources(): void {
  for (const geometry of Object.values(playerGeometry)) geometry.dispose();
  for (const material of Object.values(playerMaterial)) material.dispose();
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

function addFace(group: THREE.Group, headY: number, prefix: string): void {
  group.add(mesh(enemyGeometry.fanHead, enemyMaterial.pale, headY, `${prefix}-head`));
  const eyes = mesh(enemyGeometry.eyes, enemyMaterial.eyes, headY + 0.05, `${prefix}-eyes`);
  eyes.position.z = 0.285;
  eyes.castShadow = false;
  group.add(eyes);
}

function addBloodFan(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.fanCloak, enemyMaterial.fan, 0.72, 'blood-fan-cloak');
  parts.body = body;
  group.add(body);
  addFace(group, 1.52, 'blood-fan');
}

function addWinger(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.wingerBody, enemyMaterial.winger, 0.83, 'winger-body');
  const leftWing = mesh(enemyGeometry.wingerWing, enemyMaterial.wingerWing, 0.92, 'winger-wing-left');
  leftWing.position.x = -0.43;
  leftWing.rotation.z = -0.55;
  const rightWing = mesh(enemyGeometry.wingerWing, enemyMaterial.wingerWing, 0.92, 'winger-wing-right');
  rightWing.position.x = 0.43;
  rightWing.rotation.z = 0.55;
  parts.body = body;
  parts.leftWing = leftWing;
  parts.rightWing = rightWing;
  group.add(body, leftWing, rightWing);
  addFace(group, 1.55, 'winger');
}

function addDefender(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.defenderBody, enemyMaterial.defender, 0.75, 'defender-body');
  const shield = mesh(enemyGeometry.defenderShield, enemyMaterial.shield, 0.72, 'defender-shield');
  shield.name = 'defender-shield';
  shield.position.z = 0.42;
  parts.body = body;
  parts.shield = shield;
  group.add(body, shield);
  addFace(group, 1.65, 'defender');
}

function addEliteMarker(group: THREE.Group): THREE.Mesh {
  const marker = mesh(enemyGeometry.eliteMarker, enemyMaterial.elite, 2.25, 'elite-marker');
  marker.name = 'elite-marker';
  marker.rotation.x = Math.PI / 2;
  marker.castShadow = false;
  group.add(marker);
  return marker;
}

function addCoach(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.coachBody, enemyMaterial.coach, 0.8, 'coach-body');
  group.add(body);
  addFace(group, 1.7, 'coach');
  const aura = mesh(enemyGeometry.coachAura, enemyMaterial.aura, 0.035, 'coach-aura');
  aura.rotation.x = -Math.PI / 2;
  aura.castShadow = false;
  parts.body = body;
  parts.aura = aura;
  group.add(aura);
}

function addBatSwarm(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.batBody, enemyMaterial.bat, 0.72, 'bat-body');
  body.scale.set(1, 0.72, 1.18);
  group.add(body);

  const leftWing = mesh(enemyGeometry.batWing, enemyMaterial.batWing, 0.75, 'bat-wing-left');
  leftWing.name = 'bat-wing-left';
  leftWing.position.x = -0.34;
  leftWing.rotation.set(0, 0, -0.72);
  const rightWing = mesh(enemyGeometry.batWing, enemyMaterial.batWing, 0.75, 'bat-wing-right');
  rightWing.name = 'bat-wing-right';
  rightWing.position.x = 0.34;
  rightWing.rotation.set(0, 0, 0.72);

  const ears = mesh(enemyGeometry.batEars, enemyMaterial.bat, 0, 'bat-ears');
  const eyes = mesh(enemyGeometry.eyes, enemyMaterial.eyes, 0.8, 'bat-eyes');
  eyes.scale.setScalar(0.55);
  eyes.position.z = 0.24;
  eyes.castShadow = false;
  parts.body = body;
  parts.leftWing = leftWing;
  parts.rightWing = rightWing;
  group.add(leftWing, rightWing, ears, eyes);
}

function addLeechStriker(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.leechBody, enemyMaterial.leech, 0.78, 'leech-body');
  body.rotation.x = -0.38;
  body.scale.set(1.05, 1, 1.2);
  const mouth = mesh(enemyGeometry.leechMouth, enemyMaterial.leechMouth, 0.96, 'leech-mouth');
  mouth.position.z = 0.42;
  mouth.rotation.x = Math.PI / 2;
  mouth.castShadow = false;
  const drainRing = mesh(enemyGeometry.leechDrainRing, enemyMaterial.leechDrain, 0.08, 'leech-drain-ring');
  drainRing.name = 'leech-drain-ring';
  drainRing.rotation.x = -Math.PI / 2;
  drainRing.castShadow = false;
  drainRing.visible = false;
  parts.body = body;
  parts.mouth = mouth;
  parts.drainRing = drainRing;
  group.add(body, mouth, drainRing);
}

function addCorruptReferee(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.refereeBody, enemyMaterial.referee, 0.78, 'referee-body');
  group.add(body);
  const stripes = mesh(enemyGeometry.refereeStripes, enemyMaterial.refereeStripe, 0, 'referee-stripes');
  group.add(stripes);
  addFace(group, 1.66, 'referee');
  const whistle = mesh(enemyGeometry.refereeWhistle, enemyMaterial.refereeWhistle, 1.42, 'referee-whistle');
  whistle.position.z = 0.39;
  whistle.rotation.x = Math.PI / 2;
  const ring = mesh(
    enemyGeometry.refereeWhistleRing,
    enemyMaterial.refereeRing,
    0.08,
    'referee-whistle-ring',
  );
  ring.name = 'referee-whistle-ring';
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = false;
  ring.visible = false;
  parts.body = body;
  parts.whistle = whistle;
  parts.whistleRing = ring;
  group.add(whistle, ring);
}

function addBloodArcher(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.archerBody, enemyMaterial.archer, 0.78, 'archer-body');
  const bow = mesh(enemyGeometry.archerBow, enemyMaterial.archerBow, 1.02, 'archer-bow');
  bow.position.set(0.48, 1.02, 0.24);
  bow.rotation.set(Math.PI / 2, 0, -0.15);
  parts.body = body;
  parts.weapon = bow;
  group.add(body, bow);
  addFace(group, 1.64, 'archer');
}

function addShadowRunner(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.shadowBody, enemyMaterial.shadow, 0.84, 'shadow-body');
  const veil = mesh(enemyGeometry.shadowVeil, enemyMaterial.shadowVeil, 0.82, 'shadow-veil');
  const ring = mesh(enemyGeometry.shadowRing, enemyMaterial.shadowVeil, 0.06, 'shadow-teleport-ring');
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.castShadow = false;
  parts.body = body;
  parts.specialRing = ring;
  group.add(body, veil, ring);
  addFace(group, 1.68, 'shadow');
}

function addCorpseBomber(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.bomberBody, enemyMaterial.bomber, 0.75, 'bomber-body');
  body.scale.set(0.88, 1.2, 0.88);
  const fuse = mesh(enemyGeometry.bomberFuse, enemyMaterial.bomberFuse, 1.55, 'bomber-fuse');
  fuse.rotation.z = 0.3;
  const ring = mesh(enemyGeometry.bomberRing, enemyMaterial.dangerRing, 0.055, 'bomber-blast-ring');
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.castShadow = false;
  parts.body = body;
  parts.weapon = fuse;
  parts.specialRing = ring;
  group.add(body, fuse, ring);
  addFace(group, 1.38, 'bomber');
}

function addGoalkeeperBrute(group: THREE.Group, parts: Partial<EnemyVisual>): void {
  const body = mesh(enemyGeometry.bruteBody, enemyMaterial.brute, 0.9, 'brute-body');
  group.add(body);
  addFace(group, 1.95, 'brute');
  const leftGlove = mesh(enemyGeometry.bruteGlove, enemyMaterial.bruteGlove, 1.02, 'brute-glove-left');
  leftGlove.position.set(-0.92, 1.02, 0.28);
  const rightGlove = mesh(enemyGeometry.bruteGlove, enemyMaterial.bruteGlove, 1.02, 'brute-glove-right');
  rightGlove.position.set(0.92, 1.02, 0.28);
  const catchRing = mesh(enemyGeometry.bruteCatchRing, enemyMaterial.bruteCatch, 1.05, 'brute-catch-ring');
  catchRing.name = 'brute-catch-ring';
  catchRing.rotation.x = Math.PI / 2;
  catchRing.position.z = 0.48;
  catchRing.castShadow = false;
  catchRing.visible = false;
  parts.body = body;
  parts.leftGlove = leftGlove;
  parts.rightGlove = rightGlove;
  parts.catchRing = catchRing;
  group.add(leftGlove, rightGlove, catchRing);
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
