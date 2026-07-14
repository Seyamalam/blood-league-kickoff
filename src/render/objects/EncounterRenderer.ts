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

/** Lightweight encounter-only visuals kept separate from the core crowd renderer. */
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
      const pulse = 1 + Math.sin(elapsed * 6 + enemy.id) * 0.08;
      visual.mesh.scale.setScalar(pulse);
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
      if (interaction.kind === 'holyBeacon') visual.rotation.y = elapsed * 0.55;
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
  group.visible = false;
  const primary = new THREE.MeshStandardMaterial({
    color: kind === 'crimsonCaptain' ? 0x8e1238 : 0x45226f,
    emissive: kind === 'crimsonCaptain' ? 0x4f071d : 0x210d38,
    emissiveIntensity: 0.9,
    roughness: 0.42,
  });
  const armor = new THREE.MeshStandardMaterial({ color: 0x17131d, metalness: 0.62, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.15, 5, 8), primary);
  body.position.y = 1.1;
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 0.58), armor);
  shoulders.position.y = 1.72;
  const crown = new THREE.Mesh(
    kind === 'crimsonCaptain'
      ? new THREE.TorusGeometry(0.42, 0.1, 5, 16)
      : new THREE.OctahedronGeometry(0.42, 0),
    primary,
  );
  crown.position.y = 2.22;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.06, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffcf55, transparent: true, opacity: 0.78, depthWrite: false }),
  );
  ring.name = 'miniboss-action-ring';
  ring.position.y = 0.08;
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  group.add(body, shoulders, crown, ring);
  return group;
}

function createInteractionVisual(interaction: EnvironmentInteractionState): THREE.Group {
  const group = new THREE.Group();
  group.name = `environment-${interaction.kind}-${interaction.id}`;
  if (interaction.kind === 'bloodBarrel') {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 1.25, 10),
      new THREE.MeshStandardMaterial({ color: 0x6e112f, emissive: 0x300510, emissiveIntensity: 0.65 }),
    );
    barrel.position.y = 0.62;
    group.add(barrel);
  } else if (interaction.kind === 'holyBeacon') {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffdd83,
      emissive: 0xffb32f,
      emissiveIntensity: 1.2,
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 1.65, 6), material);
    pillar.position.y = 0.82;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.045, 5, 20),
      new THREE.MeshBasicMaterial({ color: 0xffe9aa, transparent: true, opacity: 0.75 }),
    );
    halo.position.y = 1.5;
    halo.rotation.x = Math.PI / 2;
    group.add(pillar, halo);
  } else {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.4, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x38333e, roughness: 0.88 }),
    );
    wall.position.y = 0.7;
    group.add(wall);
  }
  return group;
}

function disposeGroup(group: THREE.Group): void {
  group.removeFromParent();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
