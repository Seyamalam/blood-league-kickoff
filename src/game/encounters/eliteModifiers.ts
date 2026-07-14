import type { EnemyState, Vec3 } from '../simulation/types';

export type EliteModifierId = 'armored' | 'frenzied' | 'regenerating' | 'explosive' | 'possessed';

export interface EliteModifierDefinition {
  readonly id: EliteModifierId;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly icon: string;
}

export interface EliteModifierBinding {
  readonly enemyId: number;
  readonly modifierId: EliteModifierId;
  lastPosition: Vec3;
  pulseTimer: number;
  lastKnownHealth: number;
  enraged: boolean;
}

export type EliteModifierEvent =
  | { readonly type: 'regenerated'; readonly enemyId: number; readonly amount: number }
  | {
      readonly type: 'deathExplosion';
      readonly enemyId: number;
      readonly position: Vec3;
      readonly radius: number;
      readonly damage: number;
    }
  | {
      readonly type: 'possessionPulse';
      readonly enemyId: number;
      readonly position: Vec3;
      readonly radius: number;
      readonly speedMultiplier: number;
    };

export const ELITE_MODIFIER_DEFINITIONS: Readonly<Record<EliteModifierId, EliteModifierDefinition>> =
  Object.freeze({
    armored: Object.freeze({
      id: 'armored',
      name: 'Armored',
      description: 'Carries reinforced blood-plate and ignores light knockback.',
      color: '#aeb9c9',
      icon: 'shield',
    }),
    frenzied: Object.freeze({
      id: 'frenzied',
      name: 'Frenzied',
      description: 'Sprints and strikes faster, especially while wounded.',
      color: '#ff493d',
      icon: 'fangs',
    }),
    regenerating: Object.freeze({
      id: 'regenerating',
      name: 'Regenerating',
      description: 'Restores health in steady pulses until finished off.',
      color: '#60e08b',
      icon: 'heart-pulse',
    }),
    explosive: Object.freeze({
      id: 'explosive',
      name: 'Explosive',
      description: 'Detonates in a telegraphed blood burst on defeat.',
      color: '#ff9f40',
      icon: 'burst',
    }),
    possessed: Object.freeze({
      id: 'possessed',
      name: 'Possessed',
      description: 'Projects a dark tempo aura that empowers nearby enemies.',
      color: '#b776ff',
      icon: 'evil-eye',
    }),
  });

/** Applies a modifier's one-time stat package and returns its serializable runtime binding. */
export function applyEliteModifier(enemy: EnemyState, modifierId: EliteModifierId): EliteModifierBinding {
  enemy.elite = true;
  switch (modifierId) {
    case 'armored': {
      const bonus = Math.max(3, Math.ceil(enemy.maxHitPoints * 0.75));
      enemy.maxHitPoints += bonus;
      enemy.hitPoints += bonus;
      enemy.radius *= 1.08;
      enemy.eliteModifier = Math.max(enemy.eliteModifier, 1.65);
      break;
    }
    case 'frenzied':
      enemy.speed *= 1.32;
      enemy.attackDamage = Math.ceil(enemy.attackDamage * 1.2);
      enemy.eliteModifier = Math.max(enemy.eliteModifier, 1.45);
      break;
    case 'regenerating':
      enemy.maxHitPoints = Math.max(enemy.maxHitPoints + 2, Math.ceil(enemy.maxHitPoints * 1.25));
      enemy.hitPoints = enemy.maxHitPoints;
      enemy.eliteModifier = Math.max(enemy.eliteModifier, 1.4);
      break;
    case 'explosive':
      enemy.attackDamage = Math.ceil(enemy.attackDamage * 1.15);
      enemy.eliteModifier = Math.max(enemy.eliteModifier, 1.4);
      break;
    case 'possessed':
      enemy.maxHitPoints = Math.ceil(enemy.maxHitPoints * 1.35);
      enemy.hitPoints = enemy.maxHitPoints;
      enemy.eliteModifier = Math.max(enemy.eliteModifier, 1.5);
      break;
  }
  return {
    enemyId: enemy.id,
    modifierId,
    lastPosition: { ...enemy.position },
    pulseTimer: modifierId === 'regenerating' ? 1 : 0.8,
    lastKnownHealth: enemy.hitPoints,
    enraged: false,
  };
}

/**
 * Advances modifier effects independently from rendering. Removed explosive
 * enemies emit exactly one death burst and their bindings are retired.
 */
export function updateEliteModifiers(
  bindings: EliteModifierBinding[],
  enemies: readonly EnemyState[],
  dt: number,
): readonly EliteModifierEvent[] {
  const events: EliteModifierEvent[] = [];
  const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(1, dt)) : 0;
  for (let index = bindings.length - 1; index >= 0; index -= 1) {
    const binding = bindings[index]!;
    const enemy = enemies.find((candidate) => candidate.id === binding.enemyId);
    if (!enemy) {
      if (binding.modifierId === 'explosive' && binding.lastKnownHealth > 0) {
        events.push({
          type: 'deathExplosion',
          enemyId: binding.enemyId,
          position: { ...binding.lastPosition },
          radius: 3.4,
          damage: 18,
        });
      }
      bindings.splice(index, 1);
      continue;
    }

    binding.lastPosition = { ...enemy.position };
    if (enemy.hitPoints <= 0) {
      if (binding.modifierId === 'explosive') {
        events.push({
          type: 'deathExplosion',
          enemyId: binding.enemyId,
          position: { ...binding.lastPosition },
          radius: 3.4,
          damage: 18,
        });
      }
      bindings.splice(index, 1);
      continue;
    }
    binding.lastKnownHealth = enemy.hitPoints;
    binding.pulseTimer -= safeDt;
    if (
      binding.modifierId === 'frenzied' &&
      !binding.enraged &&
      enemy.hitPoints <= enemy.maxHitPoints * 0.4
    ) {
      binding.enraged = true;
      enemy.speed *= 1.15;
    } else if (binding.modifierId === 'regenerating' && binding.pulseTimer <= 0) {
      const amount = Math.min(enemy.maxHitPoints - enemy.hitPoints, Math.max(1, enemy.maxHitPoints * 0.06));
      if (amount > 0) {
        enemy.hitPoints += amount;
        events.push({ type: 'regenerated', enemyId: enemy.id, amount });
      }
      binding.pulseTimer += 1;
    } else if (binding.modifierId === 'possessed' && binding.pulseTimer <= 0) {
      events.push({
        type: 'possessionPulse',
        enemyId: enemy.id,
        position: { ...enemy.position },
        radius: 5.5,
        speedMultiplier: 1.18,
      });
      binding.pulseTimer += 1.25;
    }
  }
  return events;
}

export function selectEliteModifier(roll: number): EliteModifierId {
  const ids: readonly EliteModifierId[] = ['armored', 'frenzied', 'regenerating', 'explosive', 'possessed'];
  const normalized = Number.isFinite(roll) ? Math.min(1 - Number.EPSILON, Math.max(0, roll)) : 0;
  return ids[Math.floor(normalized * ids.length)]!;
}
