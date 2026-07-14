import type { EnemyArchetype } from './types';

export type EnemyCombatRole =
  | 'swarm'
  | 'sprinter'
  | 'tank'
  | 'summoner'
  | 'healer'
  | 'controller'
  | 'ranged'
  | 'assassin'
  | 'exploder'
  | 'goalDefender';

export interface EnemyArchetypeDefinition {
  readonly archetype: EnemyArchetype;
  readonly displayName: string;
  readonly role: EnemyCombatRole;
  readonly threatLevel: 1 | 2 | 3 | 4 | 5;
  readonly signature: string;
}

/** Stable gameplay-facing metadata shared by presentation, diagnostics, and future codex UI. */
export const ENEMY_ARCHETYPE_DEFINITIONS: Readonly<Record<EnemyArchetype, EnemyArchetypeDefinition>> =
  Object.freeze({
    bloodFan: Object.freeze({
      archetype: 'bloodFan',
      displayName: 'Blood Fan',
      role: 'swarm',
      threatLevel: 1,
      signature: 'fodder-cloak',
    }),
    winger: Object.freeze({
      archetype: 'winger',
      displayName: 'Crimson Winger',
      role: 'sprinter',
      threatLevel: 2,
      signature: 'swept-wings',
    }),
    defender: Object.freeze({
      archetype: 'defender',
      displayName: 'Iron Defender',
      role: 'tank',
      threatLevel: 3,
      signature: 'frontal-shield',
    }),
    coach: Object.freeze({
      archetype: 'coach',
      displayName: 'Coven Coach',
      role: 'summoner',
      threatLevel: 3,
      signature: 'command-aura',
    }),
    batSwarm: Object.freeze({
      archetype: 'batSwarm',
      displayName: 'Bat Swarm',
      role: 'sprinter',
      threatLevel: 2,
      signature: 'airborne-wings',
    }),
    leechStriker: Object.freeze({
      archetype: 'leechStriker',
      displayName: 'Leech Striker',
      role: 'healer',
      threatLevel: 3,
      signature: 'drain-maw',
    }),
    corruptReferee: Object.freeze({
      archetype: 'corruptReferee',
      displayName: 'Corrupt Referee',
      role: 'controller',
      threatLevel: 3,
      signature: 'whistle-ring',
    }),
    bloodArcher: Object.freeze({
      archetype: 'bloodArcher',
      displayName: 'Blood Archer',
      role: 'ranged',
      threatLevel: 3,
      signature: 'war-bow',
    }),
    shadowRunner: Object.freeze({
      archetype: 'shadowRunner',
      displayName: 'Shadow Runner',
      role: 'assassin',
      threatLevel: 4,
      signature: 'phase-veil',
    }),
    corpseBomber: Object.freeze({
      archetype: 'corpseBomber',
      displayName: 'Corpse Bomber',
      role: 'exploder',
      threatLevel: 4,
      signature: 'fuse-body',
    }),
    goalkeeperBrute: Object.freeze({
      archetype: 'goalkeeperBrute',
      displayName: 'Goalkeeper Brute',
      role: 'goalDefender',
      threatLevel: 5,
      signature: 'giant-gloves',
    }),
  });

export function getEnemyArchetypeDefinition(archetype: EnemyArchetype): EnemyArchetypeDefinition {
  return ENEMY_ARCHETYPE_DEFINITIONS[archetype];
}
