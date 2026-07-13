import * as THREE from 'three';
import type { EnemyState, GameState, Vec3 } from '../../game/simulation/types';

export class RenderBridge {
  private readonly player: THREE.Group;
  private readonly ball: THREE.Mesh;
  private readonly enemies = new Map<number, THREE.Group>();
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

    const liveIds = new Set<number>();
    for (const enemy of state.enemies) {
      liveIds.add(enemy.id);
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
      mesh.scale.setScalar(pulse * (enemy.radius > 0.6 ? 1.24 : 1));
    }
    for (const [id, mesh] of this.enemies) {
      if (liveIds.has(id)) continue;
      this.scene.remove(mesh);
      disposeGroup(mesh);
      this.enemies.delete(id);
    }
  }

  reset(): void {
    for (const mesh of this.enemies.values()) {
      this.scene.remove(mesh);
      disposeGroup(mesh);
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
  const cloakMaterial = new THREE.MeshStandardMaterial({
    color: enemy.radius > 0.6 ? 0x55102c : 0x271326,
    roughness: 0.72,
  });
  const paleMaterial = new THREE.MeshStandardMaterial({ color: 0xb9a6ae, roughness: 0.85 });
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.45, 7), cloakMaterial);
  cloak.position.y = 0.72;
  cloak.castShadow = true;
  group.add(cloak);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 7), paleMaterial);
  head.position.y = 1.52;
  head.castShadow = true;
  group.add(head);
  const eyes = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.045, 0.045),
    new THREE.MeshBasicMaterial({ color: 0xff174f }),
  );
  eyes.position.set(0, 1.57, 0.285);
  group.add(eyes);
  return group;
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
