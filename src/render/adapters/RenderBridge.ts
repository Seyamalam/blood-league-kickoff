import * as THREE from 'three';
import type { EnemyState, GameState, Vec3 } from '../../game/simulation/types';

const TRAIL_POINTS = 16;
const BURST_POOL_SIZE = 4;
const BURST_PARTICLES = 14;

interface HitBurst {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  positions: Float32Array;
  velocities: Float32Array;
  age: number;
  duration: number;
}

export class RenderBridge {
  private readonly player: THREE.Group;
  private readonly ball: THREE.Mesh;
  private readonly ballMaterial: THREE.MeshStandardMaterial;
  private readonly ballLight: THREE.PointLight;
  private readonly trail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly trailPositions: Float32Array;
  private readonly bursts: HitBurst[];
  private readonly enemies = new Map<number, THREE.Group>();
  private readonly liveEnemyIds = new Set<number>();
  private ballSpin = 0;
  private trailInitialized = false;
  private nextBurst = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.player = createPlayer();
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

  sync(state: GameState, ballPosition: Vec3, ballSpeed: number, dt: number, alpha: number): void {
    const p = state.player.position;
    const previousPlayer = state.player.previousPosition;
    this.player.position.set(
      THREE.MathUtils.lerp(previousPlayer.x, p.x, alpha),
      THREE.MathUtils.lerp(previousPlayer.y, p.y, alpha) - 0.9,
      THREE.MathUtils.lerp(previousPlayer.z, p.z, alpha),
    );
    this.player.rotation.y = state.player.facing;
    this.player.visible = !(
      state.player.invulnerability > 0 && Math.floor(state.player.invulnerability * 18) % 2 === 0
    );

    this.ball.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    this.ballSpin += ballSpeed * dt * 1.6;
    this.ball.rotation.set(this.ballSpin, this.ballSpin * 0.35, 0);
    this.updateBallEnergy(ballPosition, ballSpeed);
    this.updateBursts(dt);

    this.liveEnemyIds.clear();
    for (const enemy of state.enemies) {
      this.liveEnemyIds.add(enemy.id);
      let mesh = this.enemies.get(enemy.id);
      if (!mesh) {
        mesh = createEnemy(enemy);
        this.enemies.set(enemy.id, mesh);
        this.scene.add(mesh);
      }
      const flightHeight =
        enemy.archetype === 'batSwarm' ? 0.62 + Math.sin(state.elapsed * 8 + enemy.id) * 0.16 : 0;
      mesh.position.set(
        THREE.MathUtils.lerp(enemy.previousPosition.x, enemy.position.x, alpha),
        flightHeight,
        THREE.MathUtils.lerp(enemy.previousPosition.z, enemy.position.z, alpha),
      );
      mesh.lookAt(p.x, 0, p.z);
      const pulse = enemy.hitFlash > 0 ? 1.28 : 1;
      const coachPulse = enemy.archetype === 'coach' ? 1 + Math.sin(state.elapsed * 5 + enemy.id) * 0.025 : 1;
      const telegraphPulse = enemy.attackState === 'telegraph' ? 1 + Math.sin(state.elapsed * 34) * 0.08 : 1;
      const eliteScale = enemy.elite ? 1.18 : 1;
      mesh.scale.setScalar(pulse * coachPulse * telegraphPulse * eliteScale);

      const shield = mesh.getObjectByName('defender-shield');
      if (shield) {
        const shieldPulse = enemy.shieldFlash > 0 ? 1.18 + Math.sin(state.elapsed * 48) * 0.08 : 1;
        shield.scale.set(shieldPulse, shieldPulse, enemy.shieldFlash > 0 ? 1.65 : 1);
      }
      const eliteMarker = mesh.getObjectByName('elite-marker');
      if (eliteMarker) {
        eliteMarker.rotation.z += dt * 1.5;
        eliteMarker.scale.setScalar(1 + Math.sin(state.elapsed * 5 + enemy.id) * 0.08);
      }
      const leftBatWing = mesh.getObjectByName('bat-wing-left');
      const rightBatWing = mesh.getObjectByName('bat-wing-right');
      if (leftBatWing && rightBatWing) {
        const flap = Math.sin(state.elapsed * 18 + enemy.id) * 0.34;
        leftBatWing.rotation.z = -0.72 - flap;
        rightBatWing.rotation.z = 0.72 + flap;
      }
    }
    for (const [id, mesh] of this.enemies) {
      if (this.liveEnemyIds.has(id)) continue;
      this.scene.remove(mesh);
      this.enemies.delete(id);
    }
  }

  reset(): void {
    for (const mesh of this.enemies.values()) {
      this.scene.remove(mesh);
    }
    this.enemies.clear();
    this.trailInitialized = false;
    this.trail.visible = false;
    for (const burst of this.bursts) {
      burst.age = burst.duration;
      burst.points.visible = false;
    }
  }

  /** Reuses a small particle pool; safe to call for every registered ball hit. */
  hitBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity, 0xff315d);
  }

  /** Slightly brighter variant intended for a successful returning volley. */
  volleyBurst(position: Vec3, intensity = 1): void {
    this.startBurst(position, intensity * 1.25, 0xffd66b);
  }

  dispose(): void {
    this.reset();
    this.scene.remove(this.player, this.ball, this.trail, this.ballLight);
    disposeObject(this.player);
    this.ball.geometry.dispose();
    this.ballMaterial.dispose();
    this.trail.geometry.dispose();
    this.trail.material.dispose();
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
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
    burst.duration = 0.22 + strength * 0.07;
    burst.points.position.set(position.x, position.y, position.z);
    burst.points.material.color.setHex(color);
    burst.points.material.opacity = 0.9;
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

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}

function createPlayer(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 0.9, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9d5c8, roughness: 0.68 }),
  );
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  const boot = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.32, 0.95),
    new THREE.MeshStandardMaterial({ color: 0xa7193b, roughness: 0.38, metalness: 0.18 }),
  );
  boot.position.set(0, 0.22, -0.38);
  boot.castShadow = true;
  group.add(boot);
  return group;
}

function createBall(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.38, metalness: 0.08 });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), material);
  mesh.castShadow = true;
  return mesh;
}

function createEnemy(enemy: EnemyState): THREE.Group {
  const group = new THREE.Group();
  if (enemy.archetype === 'winger') addWinger(group);
  else if (enemy.archetype === 'defender') addDefender(group);
  else if (enemy.archetype === 'coach') addCoach(group);
  else if (enemy.archetype === 'batSwarm') addBatSwarm(group);
  else addBloodFan(group);
  if (enemy.elite) addEliteMarker(group);
  return group;
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
  batEar: new THREE.ConeGeometry(0.07, 0.22, 4),
  eliteMarker: new THREE.TorusGeometry(0.72, 0.055, 5, 20),
};

const enemyMaterial = {
  pale: new THREE.MeshStandardMaterial({ color: 0xb9a6ae, roughness: 0.85 }),
  eyes: new THREE.MeshBasicMaterial({ color: 0xff174f }),
  fan: new THREE.MeshStandardMaterial({ color: 0x32132f, roughness: 0.72 }),
  winger: new THREE.MeshStandardMaterial({ color: 0x8e143e, roughness: 0.56 }),
  wingerWing: new THREE.MeshStandardMaterial({ color: 0xdd315d, roughness: 0.5 }),
  defender: new THREE.MeshStandardMaterial({ color: 0x35184d, roughness: 0.8 }),
  shield: new THREE.MeshStandardMaterial({ color: 0x74426e, roughness: 0.48, metalness: 0.28 }),
  coach: new THREE.MeshStandardMaterial({ color: 0xb89526, roughness: 0.58 }),
  bat: new THREE.MeshStandardMaterial({ color: 0x17101f, roughness: 0.78 }),
  batWing: new THREE.MeshStandardMaterial({ color: 0x6e204f, roughness: 0.66, side: THREE.DoubleSide }),
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

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, y: number): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.position.y = y;
  result.castShadow = true;
  return result;
}

function addFace(group: THREE.Group, headY: number): void {
  group.add(mesh(enemyGeometry.fanHead, enemyMaterial.pale, headY));
  const eyes = mesh(enemyGeometry.eyes, enemyMaterial.eyes, headY + 0.05);
  eyes.position.z = 0.285;
  eyes.castShadow = false;
  group.add(eyes);
}

function addBloodFan(group: THREE.Group): void {
  group.add(mesh(enemyGeometry.fanCloak, enemyMaterial.fan, 0.72));
  addFace(group, 1.52);
}

function addWinger(group: THREE.Group): void {
  group.add(mesh(enemyGeometry.wingerBody, enemyMaterial.winger, 0.83));
  const leftWing = mesh(enemyGeometry.wingerWing, enemyMaterial.wingerWing, 0.92);
  leftWing.position.x = -0.43;
  leftWing.rotation.z = -0.55;
  const rightWing = mesh(enemyGeometry.wingerWing, enemyMaterial.wingerWing, 0.92);
  rightWing.position.x = 0.43;
  rightWing.rotation.z = 0.55;
  group.add(leftWing, rightWing);
  addFace(group, 1.55);
}

function addDefender(group: THREE.Group): void {
  group.add(mesh(enemyGeometry.defenderBody, enemyMaterial.defender, 0.75));
  const shield = mesh(enemyGeometry.defenderShield, enemyMaterial.shield, 0.72);
  shield.name = 'defender-shield';
  shield.position.z = 0.42;
  group.add(shield);
  addFace(group, 1.65);
}

function addEliteMarker(group: THREE.Group): void {
  const marker = mesh(enemyGeometry.eliteMarker, enemyMaterial.elite, 2.25);
  marker.name = 'elite-marker';
  marker.rotation.x = Math.PI / 2;
  marker.castShadow = false;
  group.add(marker);
}

function addCoach(group: THREE.Group): void {
  group.add(mesh(enemyGeometry.coachBody, enemyMaterial.coach, 0.8));
  addFace(group, 1.7);
  const aura = mesh(enemyGeometry.coachAura, enemyMaterial.aura, 0.035);
  aura.rotation.x = -Math.PI / 2;
  aura.castShadow = false;
  group.add(aura);
}

function addBatSwarm(group: THREE.Group): void {
  const body = mesh(enemyGeometry.batBody, enemyMaterial.bat, 0.72);
  body.scale.set(1, 0.72, 1.18);
  group.add(body);

  const leftWing = mesh(enemyGeometry.batWing, enemyMaterial.batWing, 0.75);
  leftWing.name = 'bat-wing-left';
  leftWing.position.x = -0.34;
  leftWing.rotation.set(0, 0, -0.72);
  const rightWing = mesh(enemyGeometry.batWing, enemyMaterial.batWing, 0.75);
  rightWing.name = 'bat-wing-right';
  rightWing.position.x = 0.34;
  rightWing.rotation.set(0, 0, 0.72);

  const leftEar = mesh(enemyGeometry.batEar, enemyMaterial.bat, 1.02);
  leftEar.position.x = -0.1;
  const rightEar = mesh(enemyGeometry.batEar, enemyMaterial.bat, 1.02);
  rightEar.position.x = 0.1;
  const eyes = mesh(enemyGeometry.eyes, enemyMaterial.eyes, 0.8);
  eyes.scale.setScalar(0.55);
  eyes.position.z = 0.24;
  eyes.castShadow = false;
  group.add(leftWing, rightWing, leftEar, rightEar, eyes);
}
