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
  private readonly haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xff174f,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private readonly actionRing: THREE.Mesh;
  private readonly body: THREE.Mesh;
  private readonly crown: THREE.Mesh;
  private readonly cape: THREE.Mesh;
  private readonly bloodHalo: THREE.Mesh;
  private readonly leftWing: THREE.Mesh;
  private readonly rightWing: THREE.Mesh;
  private readonly phaseLight = new THREE.PointLight(0xff174f, 0, 9, 2);
  private readonly geometries: THREE.BufferGeometry[] = [];
  private transformation = 0;

  constructor(scene: THREE.Scene) {
    this.group.name = 'count-goalkeeper-visual';
    this.body = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.85, 1.35, 6, 10)), this.bodyMaterial);
    this.body.name = 'count-goalkeeper-body';
    this.body.position.y = 1.35;
    const shoulders = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.35, 0.38, 0.72)), this.armorMaterial);
    shoulders.position.y = 2.1;
    this.crown = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.48, 0.72, 5)), this.armorMaterial);
    this.crown.name = 'count-goalkeeper-crown';
    this.crown.position.y = 3;
    const eyes = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.62, 0.08, 0.06)), this.eyeMaterial);
    eyes.position.set(0, 2.52, 0.81);
    this.actionRing = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(1.35, 0.075, 6, 28)),
      this.actionMaterial,
    );
    this.actionRing.position.set(0, 1.3, 0.85);
    this.actionRing.visible = false;
    this.cape = new THREE.Mesh(
      this.track(new THREE.ConeGeometry(1.18, 2.35, 7, 1, true, Math.PI * 0.08, Math.PI * 0.84)),
      this.bodyMaterial,
    );
    this.cape.name = 'count-goalkeeper-blood-cape';
    this.cape.position.set(0, 1.35, -0.38);
    this.cape.rotation.y = Math.PI * 0.58;
    this.cape.visible = false;

    const wingGeometry = this.track(new THREE.ConeGeometry(0.7, 2.4, 4, 1, true));
    this.leftWing = new THREE.Mesh(wingGeometry, this.armorMaterial);
    this.rightWing = new THREE.Mesh(wingGeometry, this.armorMaterial);
    this.leftWing.name = 'count-goalkeeper-wing-left';
    this.rightWing.name = 'count-goalkeeper-wing-right';
    this.leftWing.position.set(-1.08, 1.72, -0.3);
    this.rightWing.position.set(1.08, 1.72, -0.3);
    this.leftWing.rotation.set(-0.2, 0, -0.72);
    this.rightWing.rotation.set(-0.2, 0, 0.72);
    this.leftWing.visible = false;
    this.rightWing.visible = false;

    this.bloodHalo = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(0.92, 0.09, 7, 36)),
      this.haloMaterial,
    );
    this.bloodHalo.name = 'count-goalkeeper-blood-halo';
    this.bloodHalo.position.y = 2.75;
    this.bloodHalo.rotation.x = Math.PI / 2;
    this.bloodHalo.visible = false;
    this.phaseLight.position.set(0, 2, 0);
    this.group.add(
      this.body,
      shoulders,
      this.crown,
      eyes,
      this.actionRing,
      this.cape,
      this.leftWing,
      this.rightWing,
      this.bloodHalo,
      this.phaseLight,
    );
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
    const transformationTarget = state.phase === 'desperation' ? 1 : state.phase === 'bloodRush' ? 0.35 : 0;
    this.transformation = THREE.MathUtils.lerp(this.transformation, transformationTarget, 0.12);
    const transformed = this.transformation > 0.025;
    this.cape.visible = transformed;
    this.leftWing.visible = transformed;
    this.rightWing.visible = transformed;
    this.bloodHalo.visible = transformed;
    const wingBeat = Math.sin(state.phaseElapsed * (state.phase === 'desperation' ? 8 : 4)) * 0.12;
    this.leftWing.rotation.z = -0.48 - this.transformation * 0.45 - wingBeat;
    this.rightWing.rotation.z = 0.48 + this.transformation * 0.45 + wingBeat;
    this.leftWing.scale.setScalar(0.55 + this.transformation * 0.65);
    this.rightWing.scale.setScalar(0.55 + this.transformation * 0.65);
    this.cape.scale.set(0.8 + this.transformation * 0.35, 0.7 + this.transformation * 0.5, 1);
    this.cape.rotation.z = Math.sin(state.phaseElapsed * 5) * 0.045;
    this.bloodHalo.rotation.z = state.phaseElapsed * (1.4 + this.transformation * 2.2);
    this.bloodHalo.scale.setScalar(0.72 + this.transformation * 0.52);
    this.crown.scale.set(
      1 + this.transformation * 0.34,
      1 + this.transformation * 0.72,
      1 + this.transformation * 0.34,
    );
    this.body.scale.set(
      1 + this.transformation * 0.18,
      1 + this.transformation * 0.3,
      1 + this.transformation * 0.18,
    );
    this.phaseLight.intensity = this.transformation * (state.phase === 'desperation' ? 3.2 : 1.2);
    this.phaseLight.distance = 7 + this.transformation * 6;
    this.bodyMaterial.emissiveIntensity =
      state.phase === 'desperation' ? 2 : state.phase === 'bloodRush' ? 1.35 : 0.8;
  }

  reset(): void {
    this.group.visible = false;
    this.transformation = 0;
    this.body.scale.setScalar(1);
    this.crown.scale.setScalar(1);
    this.cape.visible = false;
    this.leftWing.visible = false;
    this.rightWing.visible = false;
    this.bloodHalo.visible = false;
    this.phaseLight.intensity = 0;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    this.bodyMaterial.dispose();
    this.armorMaterial.dispose();
    this.eyeMaterial.dispose();
    this.actionMaterial.dispose();
    this.haloMaterial.dispose();
  }

  private track<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }
}
