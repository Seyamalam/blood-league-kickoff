import * as THREE from 'three';
import type { MinibossState } from '../../game/boss';
import {
  ELITE_MODIFIER_DEFINITIONS,
  type EliteModifierBinding,
  type EnvironmentInteractionState,
} from '../../game/encounters';
import type { EnemyState } from '../../game/simulation/types';

interface EliteVisual {
  readonly mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly modifierId: EliteModifierBinding['modifierId'];
}

/** View-only encounter art. Gameplay positions and collision remain simulation-owned. */
export class EncounterRenderer {
  private readonly eliteVisuals = new Map<number, EliteVisual>();
  private readonly interactionVisuals = new Map<number, THREE.Group>();
  private readonly captain = createMinibossVisual('crimsonCaptain');
  private readonly playmaker = createMinibossVisual('graveyardPlaymaker');

  constructor(private readonly scene: THREE.Scene) {
    scene.add(this.captain, this.playmaker);
  }

  sync(
    bindings: readonly EliteModifierBinding[],
    enemies: readonly EnemyState[],
    miniboss: MinibossState | null,
    interactions: readonly EnvironmentInteractionState[],
    elapsed: number,
    alpha: number,
  ): void {
    const liveEliteIds = new Set<number>();
    for (const binding of bindings) {
      const enemy = enemies.find((candidate) => candidate.id === binding.enemyId);
      if (!enemy) continue;
      liveEliteIds.add(enemy.id);
      let visual = this.eliteVisuals.get(enemy.id);
      if (!visual || visual.modifierId !== binding.modifierId) {
        if (visual) this.disposeEliteVisual(visual);
        visual = createEliteVisual(binding);
        this.eliteVisuals.set(enemy.id, visual);
        this.scene.add(visual.mesh);
      }
      visual.mesh.position.set(enemy.position.x, 0.08, enemy.position.z);
      visual.mesh.rotation.z = elapsed * (binding.modifierId === 'possessed' ? -1.6 : 1.1);
      visual.mesh.scale.setScalar(1 + Math.sin(elapsed * 6 + enemy.id) * 0.08);
    }
    for (const [enemyId, visual] of this.eliteVisuals) {
      if (liveEliteIds.has(enemyId)) continue;
      this.disposeEliteVisual(visual);
      this.eliteVisuals.delete(enemyId);
    }

    const liveInteractionIds = new Set<number>();
    for (const interaction of interactions) {
      liveInteractionIds.add(interaction.id);
      let visual = this.interactionVisuals.get(interaction.id);
      if (!visual) {
        visual = createInteractionVisual(interaction);
        this.interactionVisuals.set(interaction.id, visual);
        this.scene.add(visual);
      }
      visual.visible = interaction.active;
      visual.position.set(interaction.position.x, 0, interaction.position.z);
      if (interaction.kind === 'holyBeacon') {
        const halo = visual.getObjectByName('holy-beacon-halo');
        if (halo) halo.rotation.z = elapsed * 0.9;
        const flame = visual.getObjectByName('holy-beacon-flame');
        if (flame) flame.scale.setScalar(0.9 + Math.sin(elapsed * 7) * 0.1);
      }
      if (interaction.kind === 'bloodBarrel') {
        const fuse = visual.getObjectByName('blood-barrel-fuse');
        if (fuse) fuse.rotation.z = Math.sin(elapsed * 9 + interaction.id) * 0.12;
      }
      if (interaction.kind === 'momentumGate') {
        const ready = interaction.pulseTimer <= 0;
        visual.rotation.y = Math.sin(elapsed * 1.6 + interaction.id) * 0.06;
        visual.scale.setScalar(ready ? 1 + Math.sin(elapsed * 5) * 0.035 : 0.82);
        const chevron = visual.getObjectByName('momentum-gate-arrow');
        if (chevron) chevron.position.y = 0.56 + Math.sin(elapsed * 5.5) * 0.1;
        visual.traverse((object) => {
          if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
            object.material.emissiveIntensity = ready ? 1.25 : 0.18;
          }
        });
      }
    }
    for (const [interactionId, visual] of this.interactionVisuals) {
      if (liveInteractionIds.has(interactionId)) continue;
      disposeGroup(visual);
      this.interactionVisuals.delete(interactionId);
    }

    this.syncMiniboss(this.captain, miniboss?.kind === 'crimsonCaptain' ? miniboss : null, elapsed, alpha);
    this.syncMiniboss(
      this.playmaker,
      miniboss?.kind === 'graveyardPlaymaker' ? miniboss : null,
      elapsed,
      alpha,
    );
  }

  reset(): void {
    for (const visual of this.eliteVisuals.values()) this.disposeEliteVisual(visual);
    this.eliteVisuals.clear();
    for (const visual of this.interactionVisuals.values()) disposeGroup(visual);
    this.interactionVisuals.clear();
    this.captain.visible = false;
    this.playmaker.visible = false;
  }

  dispose(): void {
    this.reset();
    disposeGroup(this.captain);
    disposeGroup(this.playmaker);
  }

  private syncMiniboss(
    visual: THREE.Group,
    state: MinibossState | null,
    elapsed: number,
    alpha: number,
  ): void {
    visual.visible = state !== null && state.phase !== 'defeated';
    if (!state) return;
    visual.position.set(
      THREE.MathUtils.lerp(state.previousPosition.x, state.position.x, alpha),
      0,
      THREE.MathUtils.lerp(state.previousPosition.z, state.position.z, alpha),
    );
    const ring = visual.getObjectByName('miniboss-action-ring');
    if (ring) {
      ring.visible = state.action === 'telegraph' || state.action === 'summon';
      ring.rotation.z = elapsed * 2.4;
      ring.scale.setScalar(1 + Math.sin(elapsed * 14) * 0.1);
    }
    const orbit = visual.getObjectByName('playmaker-orbit');
    if (orbit) {
      orbit.rotation.y = elapsed * (state.action === 'volley' ? 4.8 : 1.6);
      orbit.rotation.z = Math.sin(elapsed * 1.4) * 0.18;
    }
    const captainArmband = visual.getObjectByName('captain-armband');
    if (captainArmband) captainArmband.rotation.z = Math.sin(elapsed * 5) * 0.06;
    const weaponArm = visual.getObjectByName('captain-cleaver-arm');
    if (weaponArm) weaponArm.rotation.x = state.action === 'charge' ? -1.05 : Math.sin(elapsed * 2.4) * 0.09;
    const shieldArm = visual.getObjectByName('captain-shield-arm');
    if (shieldArm) shieldArm.rotation.z = state.action === 'telegraph' ? -0.42 : -0.12;
    const staffArm = visual.getObjectByName('playmaker-staff-arm');
    if (staffArm)
      staffArm.rotation.z = state.action === 'summon' ? -0.72 : -0.18 + Math.sin(elapsed * 2) * 0.08;
    visual.rotation.z = state.action === 'charge' ? Math.sin(elapsed * 18) * 0.08 : 0;
    visual.scale.setScalar(state.phase === 'enraged' ? 1.12 : 1);
  }

  private disposeEliteVisual(visual: EliteVisual): void {
    visual.mesh.removeFromParent();
    visual.mesh.geometry.dispose();
    visual.mesh.material.dispose();
  }
}

function createEliteVisual(binding: EliteModifierBinding): EliteVisual {
  const definition = ELITE_MODIFIER_DEFINITIONS[binding.modifierId];
  const material = new THREE.MeshBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 6, 22), material);
  mesh.name = `elite-affix-${binding.modifierId}-${binding.enemyId}`;
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, modifierId: binding.modifierId };
}

function createMinibossVisual(kind: MinibossState['kind']): THREE.Group {
  const group = new THREE.Group();
  group.name = `miniboss-${kind}`;
  group.userData.minibossRole = kind === 'crimsonCaptain' ? 'juggernaut' : 'summoner';
  group.userData.minibossSignature = kind === 'crimsonCaptain' ? 'armored-captain' : 'orbital-playmaker';
  group.visible = false;
  const primary = new THREE.MeshStandardMaterial({
    color: kind === 'crimsonCaptain' ? 0x8e1238 : 0x45226f,
    emissive: kind === 'crimsonCaptain' ? 0x4f071d : 0x210d38,
    emissiveIntensity: 0.9,
    roughness: 0.42,
  });
  const armor = new THREE.MeshStandardMaterial({ color: 0x17131d, metalness: 0.62, roughness: 0.3 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xc8b99f, roughness: 0.72 });
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      kind === 'crimsonCaptain' ? 0.68 : 0.48,
      kind === 'crimsonCaptain' ? 1.18 : 1.35,
      5,
      8,
    ),
    primary,
  );
  body.name = kind === 'crimsonCaptain' ? 'captain-armored-body' : 'playmaker-body';
  body.position.y = 1.18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(kind === 'crimsonCaptain' ? 0.48 : 0.4, 10, 7), bone);
  head.name = kind === 'crimsonCaptain' ? 'captain-vampire-head' : 'playmaker-vampire-head';
  head.position.y = 2.22;
  const mask = new THREE.Mesh(createMaskGeometry(), armor);
  mask.name = `${kind}-face-mask`;
  mask.position.set(0, 2.22, 0.39);
  const leftPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 6, 0, Math.PI), armor);
  leftPauldron.name = kind === 'crimsonCaptain' ? 'captain-shoulder-armor' : 'playmaker-shoulder-charm';
  leftPauldron.position.set(-0.66, 1.76, 0);
  leftPauldron.scale.set(1.25, 0.62, 0.92);
  const rightPauldron = leftPauldron.clone();
  rightPauldron.name = `${leftPauldron.name}-right`;
  rightPauldron.position.x *= -1;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.06, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffcf55, transparent: true, opacity: 0.78, depthWrite: false }),
  );
  ring.name = 'miniboss-action-ring';
  ring.position.y = 0.08;
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  group.add(body, head, mask, leftPauldron, rightPauldron, ring);

  if (kind === 'crimsonCaptain') {
    addCaptainEquipment(group, primary, armor);
  } else {
    addPlaymakerEquipment(group, primary, armor);
  }
  return group;
}

function addCaptainEquipment(group: THREE.Group, primary: THREE.Material, armor: THREE.Material): void {
  const crown = new THREE.Mesh(createCrownGeometry(0.43, 0.5), armor);
  crown.name = 'captain-crown';
  crown.position.y = 2.66;
  const chargeHorn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 7), armor);
  chargeHorn.name = 'captain-charge-horn';
  chargeHorn.position.set(0, 2.92, 0.08);
  chargeHorn.rotation.x = -0.24;
  const armband = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.075, 5, 12), primary);
  armband.name = 'captain-armband';
  armband.position.set(-0.72, 1.51, 0);
  armband.rotation.y = Math.PI / 2;

  const shieldArm = new THREE.Group();
  shieldArm.name = 'captain-shield-arm';
  shieldArm.position.set(-0.77, 1.62, 0);
  const shield = new THREE.Mesh(createShieldGeometry(), armor);
  shield.name = 'captain-football-shield';
  shield.position.set(-0.38, -0.38, 0.18);
  shield.rotation.y = -0.25;
  shieldArm.add(shield);

  const cleaverArm = new THREE.Group();
  cleaverArm.name = 'captain-cleaver-arm';
  cleaverArm.position.set(0.77, 1.65, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.1, 7), armor);
  handle.name = 'captain-cleaver-handle';
  handle.position.y = -0.45;
  const blade = new THREE.Mesh(createCleaverGeometry(), primary);
  blade.name = 'captain-cleaver-blade';
  blade.position.set(0, -1.05, 0);
  cleaverArm.add(handle, blade);
  group.add(crown, chargeHorn, armband, shieldArm, cleaverArm);
}

function addPlaymakerEquipment(group: THREE.Group, primary: THREE.Material, armor: THREE.Material): void {
  const focus = new THREE.Mesh(createCrownGeometry(0.3, 0.65), primary);
  focus.name = 'playmaker-focus';
  focus.position.y = 2.75;
  const orbit = new THREE.Group();
  orbit.name = 'playmaker-orbit';
  orbit.position.y = 1.45;
  for (const side of [-1, 1]) {
    const ball = createCursedFootball(primary, armor);
    ball.name = side === -1 ? 'playmaker-orb-left' : 'playmaker-orb-right';
    ball.position.x = side * 1.05;
    orbit.add(ball);
  }
  const staffArm = new THREE.Group();
  staffArm.name = 'playmaker-staff-arm';
  staffArm.position.set(0.63, 1.65, 0);
  const staff = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -1.45, 0),
        new THREE.Vector3(0.03, -0.45, 0),
        new THREE.Vector3(0.05, 0.35, 0),
        new THREE.Vector3(-0.2, 0.62, 0),
      ]),
      14,
      0.055,
      6,
      false,
    ),
    armor,
  );
  staff.name = 'playmaker-staff';
  const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), primary);
  crystal.position.set(-0.23, 0.7, 0);
  staffArm.add(staff, crystal);
  group.add(focus, orbit, staffArm);
}

function createInteractionVisual(interaction: EnvironmentInteractionState): THREE.Group {
  const group = new THREE.Group();
  group.name = `environment-${interaction.kind}-${interaction.id}`;
  group.userData.visualKind = interaction.kind;
  if (interaction.kind === 'bloodBarrel') createBloodBarrel(group);
  else if (interaction.kind === 'holyBeacon') createHolyBeacon(group);
  else if (interaction.kind === 'breakableBarrier') createBreakableBarrier(group);
  else createMomentumGate(group);
  return group;
}

function createBloodBarrel(group: THREE.Group): void {
  const blood = new THREE.MeshStandardMaterial({
    color: 0x68102d,
    emissive: 0x300510,
    emissiveIntensity: 0.65,
    roughness: 0.38,
  });
  const iron = new THREE.MeshStandardMaterial({ color: 0x211b25, metalness: 0.78, roughness: 0.3 });
  const profile = [
    new THREE.Vector2(0.42, -0.62),
    new THREE.Vector2(0.55, -0.5),
    new THREE.Vector2(0.62, -0.15),
    new THREE.Vector2(0.62, 0.15),
    new THREE.Vector2(0.55, 0.5),
    new THREE.Vector2(0.42, 0.62),
  ];
  const barrel = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), blood);
  barrel.name = 'blood-barrel-vat';
  barrel.position.y = 0.64;
  group.add(barrel);
  for (const y of [0.17, 0.62, 1.07]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.565, 0.045, 6, 16), iron);
    hoop.name = 'blood-barrel-iron-hoop';
    hoop.position.y = y;
    hoop.rotation.x = Math.PI / 2;
    group.add(hoop);
  }
  const fuse = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 0.28, 0),
        new THREE.Vector3(0.32, 0.12, 0),
      ),
      7,
      0.025,
      5,
      false,
    ),
    new THREE.MeshStandardMaterial({ color: 0xf2c56d, emissive: 0xff3b19, emissiveIntensity: 1.4 }),
  );
  fuse.name = 'blood-barrel-fuse';
  fuse.position.y = 1.27;
  group.add(fuse);
}

function createHolyBeacon(group: THREE.Group): void {
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd8a84b,
    emissive: 0xffb32f,
    emissiveIntensity: 1.2,
    metalness: 0.42,
    roughness: 0.3,
  });
  const stone = new THREE.MeshStandardMaterial({ color: 0x746b70, roughness: 0.86 });
  const light = new THREE.MeshBasicMaterial({
    color: 0xffedb4,
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.28, 8), stone);
  base.name = 'holy-beacon-stone-base';
  base.position.y = 0.14;
  const pillarProfile = [
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.2, 0.14),
    new THREE.Vector2(0.11, 0.3),
    new THREE.Vector2(0.1, 1.25),
    new THREE.Vector2(0.25, 1.42),
  ];
  const pillar = new THREE.Mesh(new THREE.LatheGeometry(pillarProfile, 12), gold);
  pillar.name = 'holy-beacon-reliquary';
  pillar.position.y = 0.24;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.045, 5, 24), light);
  halo.name = 'holy-beacon-halo';
  halo.position.y = 1.56;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7), light);
  flame.name = 'holy-beacon-flame';
  flame.position.y = 1.56;
  flame.scale.y = 1.65;
  group.add(base, pillar, halo, flame);
}

function createBreakableBarrier(group: THREE.Group): void {
  const stone = new THREE.MeshStandardMaterial({ color: 0x49434c, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x211b24, metalness: 0.66, roughness: 0.38 });
  const left = new THREE.Mesh(createJaggedSlabGeometry(-1), stone);
  left.name = 'barrier-broken-slab-left';
  left.position.x = -0.59;
  const right = new THREE.Mesh(createJaggedSlabGeometry(1), stone);
  right.name = 'barrier-broken-slab-right';
  right.position.x = 0.59;
  for (const x of [-0.72, 0, 0.72]) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.085, 1.75, 6), iron);
    spike.name = 'barrier-iron-spike';
    spike.position.set(x, 0.92, 0.1);
    spike.rotation.z = x * 0.08;
    group.add(spike);
  }
  group.add(left, right);
}

function createMomentumGate(group: THREE.Group): void {
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x59f7ff,
    emissive: 0x087d99,
    emissiveIntensity: 1.25,
    metalness: 0.42,
    roughness: 0.28,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x182d34,
    emissive: 0x05333d,
    emissiveIntensity: 0.7,
    metalness: 0.72,
    roughness: 0.28,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0xc9fdff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.18, 0, 0),
    new THREE.Vector3(-1.18, 1.25, 0),
    new THREE.Vector3(-0.62, 1.75, 0),
    new THREE.Vector3(0, 2.12, 0),
    new THREE.Vector3(0.62, 1.75, 0),
    new THREE.Vector3(1.18, 1.25, 0),
    new THREE.Vector3(1.18, 0, 0),
  ]);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.11, 7, false), cyan);
  arch.name = 'momentum-gate-gothic-arch';
  const inner = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.045, 5, false), dark);
  inner.scale.setScalar(0.88);
  inner.position.y = 0.12;
  const arrow = new THREE.Mesh(createChevronGeometry(), glow);
  arrow.name = 'momentum-gate-arrow';
  arrow.position.set(0, 0.56, 0.06);
  const football = createCursedFootball(cyan, dark);
  football.name = 'momentum-gate-football-sigil';
  football.position.set(0, 1.57, 0.05);
  football.scale.setScalar(0.42);
  group.add(arch, inner, arrow, football);
}

function createMaskGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, 0.18);
  shape.lineTo(0.32, 0.18);
  shape.lineTo(0.25, -0.19);
  shape.lineTo(0.08, -0.32);
  shape.lineTo(0, -0.2);
  shape.lineTo(-0.08, -0.32);
  shape.lineTo(-0.25, -0.19);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.02,
    bevelSegments: 1,
  });
}

function createCrownGeometry(radius: number, height: number): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(radius * 0.72, 0),
      new THREE.Vector2(radius, height * 0.18),
      new THREE.Vector2(radius * 0.82, height * 0.38),
      new THREE.Vector2(radius * 0.58, height),
      new THREE.Vector2(0, height * 0.82),
    ],
    7,
  );
}

function createShieldGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);
  shape.quadraticCurveTo(0.5, 0.42, 0.46, 0.02);
  shape.quadraticCurveTo(0.36, -0.48, 0, -0.72);
  shape.quadraticCurveTo(-0.36, -0.48, -0.46, 0.02);
  shape.quadraticCurveTo(-0.5, 0.42, 0, 0.55);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    bevelSegments: 1,
  });
}

function createCleaverGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0.38);
  shape.lineTo(0.34, 0.25);
  shape.quadraticCurveTo(0.5, -0.2, 0.1, -0.54);
  shape.lineTo(-0.16, -0.36);
  shape.lineTo(-0.1, 0.34);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.015,
    bevelSegments: 1,
  });
}

function createJaggedSlabGeometry(side: -1 | 1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.63, 0);
  shape.lineTo(0.63, 0);
  shape.lineTo(0.63, side > 0 ? 1.15 : 1.38);
  shape.lineTo(0.28, side > 0 ? 1.33 : 1.12);
  shape.lineTo(-0.02, side > 0 ? 1.08 : 1.35);
  shape.lineTo(-0.35, side > 0 ? 1.42 : 1.18);
  shape.lineTo(-0.63, side > 0 ? 1.2 : 1.38);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -0.19);
  return geometry;
}

function createChevronGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, 0.28);
  shape.lineTo(0, -0.18);
  shape.lineTo(0.48, 0.28);
  shape.lineTo(0.48, 0.52);
  shape.lineTo(0, 0.05);
  shape.lineTo(-0.48, 0.52);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createCursedFootball(panelMaterial: THREE.Material, seamMaterial: THREE.Material): THREE.Group {
  const ball = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 7), panelMaterial);
  shell.name = 'cursed-football-shell';
  ball.add(shell);
  for (const rotation of [0, Math.PI / 3, -Math.PI / 3]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.009, 4, 14), seamMaterial);
    seam.rotation.set(Math.PI / 2, rotation, 0);
    ball.add(seam);
  }
  return ball;
}

function disposeGroup(group: THREE.Group): void {
  group.removeFromParent();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    entries.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
