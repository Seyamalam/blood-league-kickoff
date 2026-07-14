import type { UpgradeId, UpgradeStacks } from '../progression/types';
import type { CharacterId } from './types';

export interface StartingLoadoutEntry {
  readonly upgradeId: UpgradeId;
  readonly stacks: number;
}

export interface CharacterStartingLoadout {
  readonly characterId: CharacterId;
  readonly name: string;
  readonly description: string;
  readonly entries: readonly StartingLoadoutEntry[];
}

/**
 * Every striker starts with a small, character-defining two-part build. These
 * stacks are granted directly and do not consume level-ups or unlock evolutions.
 */
export const CHARACTER_STARTING_LOADOUTS = Object.freeze({
  maestro: define({
    characterId: 'maestro',
    name: 'Impossible Passing',
    description: 'Rapid Recall and a spectral teammate make every return dangerous.',
    entries: [
      { upgradeId: 'rapidRecall', stacks: 1 },
      { upgradeId: 'ghostPass', stacks: 1 },
    ],
  }),
  breakaway: define({
    characterId: 'breakaway',
    name: 'Counterattack',
    description: 'A power kick and a damaging dash reward attacking open lanes.',
    entries: [
      { upgradeId: 'powerKick', stacks: 1 },
      { upgradeId: 'dashShockwave', stacks: 1 },
    ],
  }),
  tower: define({
    characterId: 'tower',
    name: 'Target Player',
    description: 'Extra power and an iron heart establish a bruising frontline striker.',
    entries: [
      { upgradeId: 'powerKick', stacks: 2 },
      { upgradeId: 'ironHeart', stacks: 1 },
    ],
  }),
  finisher: define({
    characterId: 'finisher',
    name: 'One-Touch Finish',
    description: 'A silver ball with piercing studs punches through crowded penalty boxes.',
    entries: [
      { upgradeId: 'silverBall', stacks: 1 },
      { upgradeId: 'piercingStuds', stacks: 1 },
    ],
  }),
  engine: define({
    characterId: 'engine',
    name: 'Box to Box',
    description: 'A damaging trail and wider Blood XP reach reward constant movement.',
    entries: [
      { upgradeId: 'garlicTrail', stacks: 1 },
      { upgradeId: 'bloodMagnet', stacks: 1 },
    ],
  }),
  guardian: define({
    characterId: 'guardian',
    name: 'Clean-Sheet Wall',
    description: 'A spectral defender and a recharging ward hold back the first rush.',
    entries: [
      { upgradeId: 'orbitingSpectralBall', stacks: 1 },
      { upgradeId: 'bloodBarrier', stacks: 1 },
    ],
  }),
} satisfies Record<CharacterId, CharacterStartingLoadout>);

export function startingLoadoutFor(characterId: CharacterId): Readonly<CharacterStartingLoadout> {
  return CHARACTER_STARTING_LOADOUTS[characterId];
}

/** Returns a new stack record; the supplied progression state is never mutated. */
export function applyStartingLoadout(
  stacks: Readonly<UpgradeStacks>,
  characterId: CharacterId,
): UpgradeStacks {
  const next = { ...stacks };
  for (const entry of CHARACTER_STARTING_LOADOUTS[characterId].entries) {
    next[entry.upgradeId] = Math.max(next[entry.upgradeId], entry.stacks);
  }
  return next;
}

function define(loadout: CharacterStartingLoadout): Readonly<CharacterStartingLoadout> {
  return Object.freeze({
    ...loadout,
    entries: Object.freeze(loadout.entries.map((entry) => Object.freeze({ ...entry }))),
  });
}
