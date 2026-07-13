import * as THREE from 'three';
import type { EnemyState, GameState, Vec3 } from '../../game/simulation/types';

export class RenderBridge {
  private readonly player: THREE.Group;
  private readonly ball: THREE.Mesh;
  private readonly enemies = new Map<number, THREE.Group>();
  private readonly liveEnemyIds = new Set<number>();
  private ballSpin = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.player = createPlayer();
    this.ball = createBall();
    scene.add(this.player, this.ball);
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
    this.player.visible = !(state.player.invulnerability > 0 && Math.floor(state.player.invulnerability * 18) % 2 === 0);

    this.ball.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    this.ballSpin += ballSpeed * dt * 1.6;
    this.ball.rotation.set(this.ballSpin, this.ballSpin * 0.35, 0);

    this.liveEnemyIds.clear();
    for (const enemy of state.enemies) {
      this.liveEnemyIds.add(enemy.id);
      let mesh = this.enemies.get(enemy.id);
      if (!mesh) {
        mesh = createEnemy(enemy);
        this.enemies.set(enemy.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(
        THREE.MathUtils.lerp(enemy.previousPosition.x, enemy.position.x, alpha),
        0,
        THREE.MathUtils.lerp(enemy.previousPosition.z, enemy.position.z, alpha),
      );
      mesh.lookAt(p.x, 0, p.z);
      const pulse = enemy.hitFlash > 0 ? 1.28 : 1;
      const coachPulse = enemy.archetype === 'coach' ? 1 + Math.sin(state.elapsed * 5 + enemy.id) * 0.025 : 1;
      mesh.scale.setScalar(pulse * coachPulse);
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
  }
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
  else addBloodFan(group);
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
  aura: new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
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
  shield.position.z = 0.42;
  group.add(shield);
  addFace(group, 1.65);
}

function addCoach(group: THREE.Group): void {
  group.add(mesh(enemyGeometry.coachBody, enemyMaterial.coach, 0.8));
  addFace(group, 1.7);
  const aura = mesh(enemyGeometry.coachAura, enemyMaterial.aura, 0.035);
  aura.rotation.x = -Math.PI / 2;
  aura.castShadow = false;
  group.add(aura);
}
