import * as THREE from 'three';
import type { CountGoalkeeperState } from '../../game/boss';

export class CountGoalkeeperVisual {
  private readonly group = new THREE.Group();
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x39091d,
    emissive: 0x5b071f,
    emissiveIntensity: 0.8,
    roughness: 0.42,
  });
  private readonly armorMaterial = new THREE.MeshStandardMaterial({
    color: 0x17131d,
    metalness: 0.72,
    roughness: 0.28,
  });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff315f });
  private readonly actionMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcf40,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  private readonly actionRing: THREE.Mesh;
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(scene: THREE.Scene) {
    const body = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.85, 1.35, 6, 10)), this.bodyMaterial);
    body.position.y = 1.35;
    const shoulders = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.35, 0.38, 0.72)), this.armorMaterial);
    shoulders.position.y = 2.1;
    const crown = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.48, 0.72, 5)), this.armorMaterial);
    crown.position.y = 3;
    const eyes = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.62, 0.08, 0.06)), this.eyeMaterial);
    eyes.position.set(0, 2.52, 0.81);
    this.actionRing = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(1.35, 0.075, 6, 28)),
      this.actionMaterial,
    );
    this.actionRing.position.set(0, 1.3, 0.85);
    this.actionRing.visible = false;
    this.group.add(body, shoulders, crown, eyes, this.actionRing);
    this.group.visible = false;
    this.group.scale.setScalar(1.15);
    scene.add(this.group);
  }

  sync(state: CountGoalkeeperState | null, alpha: number): void {
    this.group.visible = state !== null && state.phase !== 'defeated';
    if (!state) return;
    const t = THREE.MathUtils.clamp(alpha, 0, 1);
    this.group.position.set(
      THREE.MathUtils.lerp(state.previousPosition.x, state.position.x, t),
      0,
      THREE.MathUtils.lerp(state.previousPosition.z, state.position.z, t),
    );
    this.group.rotation.y =
      state.action === 'telegraph' || state.action === 'diveTelegraph'
        ? Math.sin(state.actionElapsed * 28) * 0.08
        : 0;
    this.group.rotation.z = state.action === 'dive' ? Math.sign(state.velocity.x) * -0.34 : 0;
    this.actionRing.visible =
      state.action === 'diveTelegraph' || state.action === 'counterattack' || state.action === 'vulnerable';
    this.actionRing.rotation.z = state.actionElapsed * 3.5;
    this.actionRing.scale.setScalar(
      state.action === 'vulnerable' ? 1.25 + Math.sin(state.actionElapsed * 18) * 0.08 : 1,
    );
    this.actionMaterial.color.setHex(state.action === 'vulnerable' ? 0x68ffb0 : 0xffcf40);
    this.bodyMaterial.emissiveIntensity =
      state.phase === 'desperation' ? 2 : state.phase === 'bloodRush' ? 1.35 : 0.8;
  }

  reset(): void {
    this.group.visible = false;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    this.bodyMaterial.dispose();
    this.armorMaterial.dispose();
    this.eyeMaterial.dispose();
    this.actionMaterial.dispose();
  }

  private track<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }
}
