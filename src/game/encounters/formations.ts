import { PLAYABLE_HALF_LENGTH, PLAYABLE_HALF_WIDTH } from '../field';
import { spawnEnemyAt } from '../simulation/gameState';
import type { EnemyArchetype, EnemyState, GameState, Vec3 } from '../simulation/types';
import { applyEliteModifier, type EliteModifierBinding, type EliteModifierId } from './eliteModifiers';

export type EnemyFormationId =
  'lineBreakers' | 'penaltyBoxAmbush' | 'midfieldSwarm' | 'wideOverload' | 'cornerAssault' | 'pitchInvasion';

export interface FormationSlot {
  readonly archetype: EnemyArchetype;
  readonly x: number;
  readonly z: number;
  readonly eliteModifier?: EliteModifierId;
}

export interface EnemyFormationDefinition {
  readonly id: EnemyFormationId;
  readonly name: string;
  readonly announcement: string;
  readonly icon: string;
  readonly slots: readonly FormationSlot[];
}

export interface FormationSpawnResult {
  readonly formationId: EnemyFormationId;
  readonly enemies: readonly EnemyState[];
  readonly eliteBindings: readonly EliteModifierBinding[];
}

function freezeFormation(definition: EnemyFormationDefinition): Readonly<EnemyFormationDefinition> {
  return Object.freeze({
    ...definition,
    slots: Object.freeze(definition.slots.map((slot) => Object.freeze({ ...slot }))),
  });
}

export const ENEMY_FORMATIONS: Readonly<Record<EnemyFormationId, EnemyFormationDefinition>> = Object.freeze({
  lineBreakers: freezeFormation({
    id: 'lineBreakers',
    name: 'Line Breakers',
    announcement: 'THE BACK LINE ADVANCES',
    icon: 'formation-line',
    slots: [
      { archetype: 'defender', x: -4, z: 0 },
      { archetype: 'defender', x: 0, z: 0, eliteModifier: 'armored' },
      { archetype: 'defender', x: 4, z: 0 },
      { archetype: 'winger', x: -7, z: 2.8 },
      { archetype: 'winger', x: 7, z: 2.8 },
    ],
  }),
  penaltyBoxAmbush: freezeFormation({
    id: 'penaltyBoxAmbush',
    name: 'Penalty Box Ambush',
    announcement: 'THE BOX IS CURSED',
    icon: 'penalty-box',
    slots: [
      { archetype: 'goalkeeperBrute', x: 0, z: -2.2, eliteModifier: 'possessed' },
      { archetype: 'defender', x: -4.8, z: 0 },
      { archetype: 'defender', x: 4.8, z: 0 },
      { archetype: 'bloodArcher', x: -7, z: 3.6 },
      { archetype: 'bloodArcher', x: 7, z: 3.6 },
      { archetype: 'corpseBomber', x: 0, z: 5.4 },
    ],
  }),
  midfieldSwarm: freezeFormation({
    id: 'midfieldSwarm',
    name: 'Midfield Swarm',
    announcement: 'MIDFIELD OVERRUN',
    icon: 'swarm',
    slots: [
      { archetype: 'batSwarm', x: -5, z: -3 },
      { archetype: 'batSwarm', x: 0, z: -4 },
      { archetype: 'batSwarm', x: 5, z: -3 },
      { archetype: 'bloodFan', x: -7, z: 1 },
      { archetype: 'coach', x: 0, z: 1, eliteModifier: 'regenerating' },
      { archetype: 'bloodFan', x: 7, z: 1 },
      { archetype: 'leechStriker', x: -3, z: 4 },
      { archetype: 'leechStriker', x: 3, z: 4 },
    ],
  }),
  wideOverload: freezeFormation({
    id: 'wideOverload',
    name: 'Wide Overload',
    announcement: 'THE WINGS ARE FLOODED',
    icon: 'wide-overload',
    slots: [
      { archetype: 'shadowRunner', x: -20, z: -3, eliteModifier: 'frenzied' },
      { archetype: 'winger', x: -15, z: 1 },
      { archetype: 'bloodArcher', x: -20, z: 6 },
      { archetype: 'shadowRunner', x: 20, z: -3 },
      { archetype: 'winger', x: 15, z: 1 },
      { archetype: 'bloodArcher', x: 20, z: 6 },
      { archetype: 'coach', x: 0, z: 4, eliteModifier: 'possessed' },
    ],
  }),
  cornerAssault: freezeFormation({
    id: 'cornerAssault',
    name: 'Corner Assault',
    announcement: 'WATCH BOTH CORNERS',
    icon: 'corner-flag',
    slots: [
      { archetype: 'shadowRunner', x: -8, z: -5, eliteModifier: 'frenzied' },
      { archetype: 'shadowRunner', x: 8, z: -5 },
      { archetype: 'bloodArcher', x: -8, z: 0 },
      { archetype: 'bloodArcher', x: 8, z: 0 },
      { archetype: 'winger', x: -5, z: 4 },
      { archetype: 'winger', x: 5, z: 4 },
    ],
  }),
  pitchInvasion: freezeFormation({
    id: 'pitchInvasion',
    name: 'Pitch Invasion',
    announcement: 'THE DEAD STORM THE PITCH',
    icon: 'pitch-invasion',
    slots: [
      { archetype: 'bloodFan', x: -10, z: -5 },
      { archetype: 'bloodFan', x: -5, z: -7 },
      { archetype: 'bloodFan', x: 0, z: -8, eliteModifier: 'explosive' },
      { archetype: 'bloodFan', x: 5, z: -7 },
      { archetype: 'bloodFan', x: 10, z: -5 },
      { archetype: 'winger', x: -10, z: 2 },
      { archetype: 'winger', x: 10, z: 2 },
      { archetype: 'corpseBomber', x: -4, z: 4 },
      { archetype: 'coach', x: 0, z: 5, eliteModifier: 'possessed' },
      { archetype: 'corpseBomber', x: 4, z: 4 },
    ],
  }),
});

/** Spawns an authored group around an anchor, mirrored for either attacking direction. */
export function spawnEnemyFormation(
  state: GameState,
  formationId: EnemyFormationId,
  anchor: Readonly<Vec3>,
  facing: -1 | 1 = 1,
): FormationSpawnResult {
  const definition = ENEMY_FORMATIONS[formationId];
  const enemies: EnemyState[] = [];
  const eliteBindings: EliteModifierBinding[] = [];
  for (const slot of definition.slots) {
    const enemy = spawnEnemyAt(state, slot.archetype, {
      x: clamp(anchor.x + slot.x * facing, -PLAYABLE_HALF_WIDTH, PLAYABLE_HALF_WIDTH),
      y: anchor.y,
      z: clamp(anchor.z + slot.z * facing, -PLAYABLE_HALF_LENGTH, PLAYABLE_HALF_LENGTH),
    });
    enemies.push(enemy);
    if (slot.eliteModifier) eliteBindings.push(applyEliteModifier(enemy, slot.eliteModifier));
  }
  return { formationId, enemies, eliteBindings };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
