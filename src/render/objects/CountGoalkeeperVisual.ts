import * as THREE from 'three';
import type { CountGoalkeeperState } from '../../game/boss';

/** Articulated, view-only boss silhouette. Boss rules and collision stay in the simulation. */
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
  private readonly gloveMaterial = new THREE.MeshStandardMaterial({
    color: 0xddd5b6,
    emissive: 0x491127,
    emissiveIntensity: 0.25,
    roughness: 0.54,
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
  private readonly leftWingPivot = new THREE.Group();
  private readonly rightWingPivot = new THREE.Group();
  private readonly leftWing: THREE.Mesh;
  private readonly rightWing: THREE.Mesh;
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftGlove: THREE.Group;
  private readonly rightGlove: THREE.Group;
  private readonly phaseMask: THREE.Mesh;
  private readonly tendrils = new THREE.Group();
  private readonly phaseLight = new THREE.PointLight(0xff174f, 0, 9, 2);
  private readonly geometries: THREE.BufferGeometry[] = [];
  private transformation = 0;

  constructor(scene: THREE.Scene) {
    this.group.name = 'count-goalkeeper-visual';
    this.group.userData.visualRole = 'vampire-goalkeeper-boss';
    this.body = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.78, 1.28, 6, 10)), this.bodyMaterial);
    this.body.name = 'count-goalkeeper-body';
    this.body.position.y = 1.43;

    const chestArmor = new THREE.Mesh(this.track(createChestArmorGeometry()), this.armorMaterial);
    chestArmor.name = 'count-goalkeeper-chest-armor';
    chestArmor.position.set(0, 1.72, 0.64);
    const crest = new THREE.Mesh(this.track(createBatCrestGeometry()), this.eyeMaterial);
    crest.name = 'count-goalkeeper-crest';
    crest.position.set(0, 1.85, 0.77);
    crest.scale.setScalar(0.48);

    const head = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.5, 12, 8)), this.gloveMaterial);
    head.name = 'count-goalkeeper-head';
    head.position.y = 2.5;
    head.scale.set(0.86, 1.08, 0.9);
    const faceMask = new THREE.Mesh(this.track(createGoalkeeperMaskGeometry()), this.armorMaterial);
    faceMask.name = 'count-goalkeeper-mask';
    faceMask.position.set(0, 2.5, 0.42);
    const leftEye = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.055, 7, 5)), this.eyeMaterial);
    leftEye.name = 'count-goalkeeper-eye-left';
    leftEye.position.set(-0.16, 2.57, 0.52);
    const rightEye = leftEye.clone();
    rightEye.name = 'count-goalkeeper-eye-right';
    rightEye.position.x *= -1;

    const leftPauldron = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(0.46, 10, 7, 0, Math.PI)),
      this.armorMaterial,
    );
    leftPauldron.name = 'count-goalkeeper-pauldron-left';
    leftPauldron.position.set(-0.78, 2.05, 0);
    leftPauldron.scale.set(1.28, 0.62, 1);
    const rightPauldron = leftPauldron.clone();
    rightPauldron.name = 'count-goalkeeper-pauldron-right';
    rightPauldron.position.x *= -1;

    this.leftGlove = this.createGoalkeeperArm(this.leftArm, -1);
    this.rightGlove = this.createGoalkeeperArm(this.rightArm, 1);

    this.crown = new THREE.Mesh(this.track(createKeeperCrownGeometry()), this.armorMaterial);
    this.crown.name = 'count-goalkeeper-crown';
    this.crown.position.y = 3.02;
    this.actionRing = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(1.35, 0.075, 6, 28)),
      this.actionMaterial,
    );
    this.actionRing.name = 'count-goalkeeper-action-ring';
    this.actionRing.position.set(0, 1.3, 0.85);
    this.actionRing.visible = false;

    this.cape = new THREE.Mesh(this.track(createCapeGeometry()), this.bodyMaterial);
    this.cape.name = 'count-goalkeeper-blood-cape';
    this.cape.position.set(0, 2.14, -0.47);
    this.cape.visible = false;

    const wingGeometry = this.track(createBatWingGeometry());
    this.leftWing = new THREE.Mesh(wingGeometry, this.armorMaterial);
    this.rightWing = new THREE.Mesh(wingGeometry, this.armorMaterial);
    this.leftWing.name = 'count-goalkeeper-wing-left';
    this.rightWing.name = 'count-goalkeeper-wing-right';
    this.leftWingPivot.name = 'count-goalkeeper-wing-pivot-left';
    this.rightWingPivot.name = 'count-goalkeeper-wing-pivot-right';
    this.leftWingPivot.position.set(-0.56, 2.08, -0.36);
    this.rightWingPivot.position.set(0.56, 2.08, -0.36);
    this.leftWing.scale.x = -1;
    this.leftWingPivot.add(this.leftWing);
    this.rightWingPivot.add(this.rightWing);
    this.leftWingPivot.visible = false;
    this.rightWingPivot.visible = false;

    this.bloodHalo = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(0.92, 0.09, 7, 36)),
      this.haloMaterial,
    );
    this.bloodHalo.name = 'count-goalkeeper-blood-halo';
    this.bloodHalo.position.y = 2.78;
    this.bloodHalo.rotation.x = Math.PI / 2;
    this.bloodHalo.visible = false;

    this.phaseMask = new THREE.Mesh(this.track(createPhaseMaskGeometry()), this.haloMaterial);
    this.phaseMask.name = 'count-goalkeeper-phase-mask';
    this.phaseMask.position.set(0, 2.48, 0.55);
    this.phaseMask.visible = false;
    this.createTendrils();

    this.phaseLight.position.set(0, 2, 0);
    this.group.add(
      this.body,
      chestArmor,
      crest,
      head,
      faceMask,
      leftEye,
      rightEye,
      leftPauldron,
      rightPauldron,
      this.leftArm,
      this.rightArm,
      this.crown,
      this.actionRing,
      this.cape,
      this.leftWingPivot,
      this.rightWingPivot,
      this.bloodHalo,
      this.phaseMask,
      this.tendrils,
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
    this.leftWingPivot.visible = transformed;
    this.rightWingPivot.visible = transformed;
    this.bloodHalo.visible = transformed;
    this.phaseMask.visible = state.phase === 'desperation';
    this.tendrils.visible = state.phase === 'desperation';

    const wingBeat = Math.sin(state.phaseElapsed * (state.phase === 'desperation' ? 8 : 4)) * 0.14;
    this.leftWingPivot.rotation.z = -0.2 - this.transformation * 0.5 - wingBeat;
    this.rightWingPivot.rotation.z = 0.2 + this.transformation * 0.5 + wingBeat;
    this.leftWingPivot.rotation.y = 0.25 + wingBeat * 0.5;
    this.rightWingPivot.rotation.y = -0.25 - wingBeat * 0.5;
    this.leftWing.scale.set(-0.55 - this.transformation * 0.55, 0.55 + this.transformation * 0.55, 1);
    this.rightWing.scale.setScalar(0.55 + this.transformation * 0.55);
    this.cape.scale.set(0.8 + this.transformation * 0.35, 0.7 + this.transformation * 0.5, 1);
    this.cape.rotation.z = Math.sin(state.phaseElapsed * 5) * 0.045;
    this.bloodHalo.rotation.z = state.phaseElapsed * (1.4 + this.transformation * 2.2);
    this.bloodHalo.scale.setScalar(0.72 + this.transformation * 0.52);
    this.phaseMask.scale.setScalar(0.82 + Math.sin(state.phaseElapsed * 6) * 0.05);
    this.tendrils.rotation.y = state.phaseElapsed * 0.55;
    this.tendrils.children.forEach((tendril, index) => {
      tendril.rotation.z = Math.sin(state.phaseElapsed * 3.6 + index) * 0.16;
    });
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
    this.poseArms(state);
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
    this.leftWingPivot.visible = false;
    this.rightWingPivot.visible = false;
    this.bloodHalo.visible = false;
    this.phaseMask.visible = false;
    this.tendrils.visible = false;
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.phaseLight.intensity = 0;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    this.bodyMaterial.dispose();
    this.armorMaterial.dispose();
    this.gloveMaterial.dispose();
    this.eyeMaterial.dispose();
    this.actionMaterial.dispose();
    this.haloMaterial.dispose();
  }

  private createGoalkeeperArm(arm: THREE.Group, side: -1 | 1): THREE.Group {
    arm.name = side < 0 ? 'count-goalkeeper-arm-left' : 'count-goalkeeper-arm-right';
    arm.position.set(side * 0.78, 1.98, 0);
    const limb = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.18, 0.75, 5, 7)), this.bodyMaterial);
    limb.position.y = -0.43;
    limb.rotation.z = side * -0.08;
    const glove = new THREE.Group();
    glove.name = side < 0 ? 'count-goalkeeper-glove-left' : 'count-goalkeeper-glove-right';
    glove.position.set(side * 0.05, -1.02, 0.09);
    const palm = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.32, 9, 7)), this.gloveMaterial);
    palm.scale.set(1.25, 1.05, 0.65);
    palm.name = `${glove.name}-palm`;
    for (let finger = 0; finger < 4; finger += 1) {
      const digit = new THREE.Mesh(
        this.track(new THREE.CapsuleGeometry(0.045, 0.26, 3, 5)),
        this.gloveMaterial,
      );
      digit.name = `${glove.name}-finger-${finger}`;
      digit.position.set(side * (finger - 1.5) * 0.09, -0.26, 0.02);
      digit.rotation.z = side * (finger - 1.5) * 0.07;
      glove.add(digit);
    }
    glove.add(palm);
    arm.add(limb, glove);
    return glove;
  }

  private createTendrils(): void {
    this.tendrils.name = 'count-goalkeeper-blood-tendrils';
    this.tendrils.position.y = 1.08;
    this.tendrils.visible = false;
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.4, 0),
        new THREE.Vector3(Math.cos(angle) * 0.72, -0.15, Math.sin(angle) * 0.72),
        new THREE.Vector3(Math.cos(angle) * 1.18, -0.78, Math.sin(angle) * 1.18),
      );
      const tendril = new THREE.Mesh(
        this.track(new THREE.TubeGeometry(curve, 10, 0.045, 5, false)),
        this.haloMaterial,
      );
      tendril.name = `count-goalkeeper-blood-tendril-${index}`;
      this.tendrils.add(tendril);
    }
  }

  private poseArms(state: CountGoalkeeperState): void {
    const pulse = Math.sin(state.phaseElapsed * 3) * 0.06;
    let leftZ = 0.18 + pulse;
    let rightZ = -0.18 - pulse;
    let reachX = 0;
    if (state.action === 'diveTelegraph') {
      leftZ = 0.85;
      rightZ = -0.85;
    } else if (state.action === 'dive') {
      const direction = Math.sign(state.velocity.x) || 1;
      leftZ = direction > 0 ? -1.25 : 0.25;
      rightZ = direction > 0 ? -0.25 : 1.25;
      reachX = -0.35;
    } else if (state.action === 'counterattack') {
      leftZ = 1.15;
      rightZ = -1.15;
      reachX = -0.65;
    } else if (state.action === 'vulnerable') {
      leftZ = -0.65;
      rightZ = 0.65;
    }
    this.leftArm.rotation.set(reachX, 0, leftZ);
    this.rightArm.rotation.set(reachX, 0, rightZ);
    const grip = state.action === 'counterattack' ? 1.18 : 1;
    this.leftGlove.scale.setScalar(grip);
    this.rightGlove.scale.setScalar(grip);
  }

  private track<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }
}

function createChestArmorGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, 0.36);
  shape.quadraticCurveTo(0, 0.58, 0.56, 0.36);
  shape.lineTo(0.42, -0.36);
  shape.quadraticCurveTo(0, -0.58, -0.42, -0.36);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.025,
    bevelSegments: 1,
  });
}

function createGoalkeeperMaskGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0.25);
  shape.lineTo(0.34, 0.25);
  shape.lineTo(0.28, -0.2);
  shape.lineTo(0.1, -0.36);
  shape.lineTo(0, -0.25);
  shape.lineTo(-0.1, -0.36);
  shape.lineTo(-0.28, -0.2);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.02,
    bevelSegments: 1,
  });
}

function createPhaseMaskGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.46, 0.34);
  shape.lineTo(-0.1, 0.16);
  shape.lineTo(0, 0.46);
  shape.lineTo(0.1, 0.16);
  shape.lineTo(0.46, 0.34);
  shape.lineTo(0.3, -0.3);
  shape.lineTo(0, -0.48);
  shape.lineTo(-0.3, -0.3);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createBatCrestGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.15);
  shape.lineTo(-0.42, 0.22);
  shape.lineTo(-0.24, -0.24);
  shape.lineTo(0, 0.05);
  shape.lineTo(0.24, -0.24);
  shape.lineTo(0.42, 0.22);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createKeeperCrownGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.5, 0.12),
      new THREE.Vector2(0.42, 0.26),
      new THREE.Vector2(0.24, 0.72),
      new THREE.Vector2(0, 0.56),
    ],
    7,
  );
}

function createCapeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -0.72, 0, 0, 0.72, 0, 0, -1.08, -1.85, -0.12, 0.72, 0, 0, 1.08, -1.85, -0.12, -1.08, -1.85, -0.12,
        -1.08, -1.85, -0.12, 1.08, -1.85, -0.12, 0, -2.2, 0.05,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function createBatWingGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.75, 0.38, 1.7, 0.16);
  shape.lineTo(1.28, -0.28);
  shape.lineTo(1.72, -0.72);
  shape.lineTo(0.98, -0.66);
  shape.lineTo(1.18, -1.24);
  shape.lineTo(0.54, -0.82);
  shape.lineTo(0.18, -1.38);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false });
}
