import type { MatchStage } from '../match';
import type { GameState, Vec3 } from '../simulation/types';
import type { EliteModifierBinding } from './eliteModifiers';
import { spawnEnemyFormation, type EnemyFormationId, type FormationSpawnResult } from './formations';

export type PitchEventId = 'firstPress' | 'boxAmbush' | 'midfieldCollapse' | 'cornerCurse' | 'finalInvasion';

export interface PitchEventDefinition {
  readonly id: PitchEventId;
  readonly name: string;
  readonly announcement: string;
  readonly icon: string;
  readonly triggerTime: number;
  readonly stages: readonly MatchStage[];
  readonly formationId: EnemyFormationId;
  readonly anchor: Vec3;
  readonly facing: -1 | 1;
  readonly maxPopulation: number;
}

export interface PitchEventDirectorState {
  readonly triggered: Set<PitchEventId>;
  lastEventTime: number;
}

export interface PitchEventTriggered {
  readonly type: 'pitchEventTriggered';
  readonly eventId: PitchEventId;
  readonly announcement: string;
  readonly icon: string;
  readonly formation: FormationSpawnResult;
  readonly eliteBindings: readonly EliteModifierBinding[];
}

const EVENT_ORDER: readonly PitchEventDefinition[] = Object.freeze([
  Object.freeze({
    id: 'firstPress',
    name: 'First Press',
    announcement: 'THE BACK LINE ADVANCES',
    icon: 'formation-line',
    triggerTime: 55,
    stages: Object.freeze(['firstHalf'] as const),
    formationId: 'lineBreakers',
    anchor: Object.freeze({ x: 0, y: 0.9, z: -13 }),
    facing: 1,
    maxPopulation: 52,
  }),
  Object.freeze({
    id: 'boxAmbush',
    name: 'Box Ambush',
    announcement: 'THE PENALTY BOX IS CURSED',
    icon: 'penalty-box',
    triggerTime: 125,
    stages: Object.freeze(['firstHalf', 'escalation'] as const),
    formationId: 'penaltyBoxAmbush',
    anchor: Object.freeze({ x: 0, y: 0.9, z: -34 }),
    facing: 1,
    maxPopulation: 54,
  }),
  Object.freeze({
    id: 'midfieldCollapse',
    name: 'Midfield Collapse',
    announcement: 'MIDFIELD OVERRUN',
    icon: 'swarm',
    triggerTime: 205,
    stages: Object.freeze(['escalation'] as const),
    formationId: 'midfieldSwarm',
    anchor: Object.freeze({ x: 0, y: 0.9, z: 0 }),
    facing: 1,
    maxPopulation: 58,
  }),
  Object.freeze({
    id: 'cornerCurse',
    name: 'Corner Curse',
    announcement: 'WATCH BOTH CORNERS',
    icon: 'corner-flag',
    triggerTime: 320,
    stages: Object.freeze(['bloodMoon'] as const),
    formationId: 'cornerAssault',
    anchor: Object.freeze({ x: 0, y: 0.9, z: -18 }),
    facing: 1,
    maxPopulation: 64,
  }),
  Object.freeze({
    id: 'finalInvasion',
    name: 'Final Invasion',
    announcement: 'THE DEAD STORM THE PITCH',
    icon: 'pitch-invasion',
    triggerTime: 455,
    stages: Object.freeze(['finalWave'] as const),
    formationId: 'pitchInvasion',
    anchor: Object.freeze({ x: 0, y: 0.9, z: 12 }),
    facing: -1,
    maxPopulation: 62,
  }),
]);

export const PITCH_EVENT_DEFINITIONS: Readonly<Record<PitchEventId, PitchEventDefinition>> = Object.freeze(
  Object.fromEntries(EVENT_ORDER.map((definition) => [definition.id, definition])) as Record<
    PitchEventId,
    PitchEventDefinition
  >,
);

export function createPitchEventDirectorState(): PitchEventDirectorState {
  return { triggered: new Set(), lastEventTime: Number.NEGATIVE_INFINITY };
}

export function resetPitchEventDirector(state: PitchEventDirectorState): void {
  state.triggered.clear();
  state.lastEventTime = Number.NEGATIVE_INFINITY;
}

/**
 * Selects and immediately spawns the next eligible authored event. The event
 * remains pending while the crowd is too dense, so it cannot be skipped by lag.
 */
export function updatePitchEventDirector(
  director: PitchEventDirectorState,
  game: GameState,
  stage: MatchStage,
): PitchEventTriggered | undefined {
  if (game.phase !== 'playing') return undefined;
  for (const definition of EVENT_ORDER) {
    if (director.triggered.has(definition.id)) continue;
    if (game.elapsed < definition.triggerTime) return undefined;
    if (!definition.stages.includes(stage)) continue;
    if (game.enemies.length > definition.maxPopulation) return undefined;
    const formation = spawnEnemyFormation(game, definition.formationId, definition.anchor, definition.facing);
    director.triggered.add(definition.id);
    director.lastEventTime = game.elapsed;
    return {
      type: 'pitchEventTriggered',
      eventId: definition.id,
      announcement: definition.announcement,
      icon: definition.icon,
      formation,
      eliteBindings: formation.eliteBindings,
    };
  }
  return undefined;
}
