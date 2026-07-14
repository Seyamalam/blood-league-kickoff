import type { CharacterId } from '../characters';
import type { CharacterUltimateDefinition } from './characterUltimateTypes';

export const CHARACTER_ULTIMATE_DEFINITIONS = Object.freeze({
  maestro: define({
    id: 'midnightOrchestra',
    characterId: 'maestro',
    name: 'Midnight Orchestra',
    description: 'Spectral teammates thread six instant passes while recall and volley timing accelerate.',
    callout: 'CONTROL THE TEMPO',
    iconId: 'ultimate-midnight-orchestra',
    chargeRequired: 100,
    duration: 6,
  }),
  breakaway: define({
    id: 'redlineCounter',
    characterId: 'breakaway',
    name: 'Redline Counter',
    description: 'Explode into a sprint that repeatedly blasts nearby enemies off the running lane.',
    callout: 'CATCH ME IF YOU CAN',
    iconId: 'ultimate-redline-counter',
    chargeRequired: 100,
    duration: 7,
  }),
  tower: define({
    id: 'meteorHeader',
    characterId: 'tower',
    name: 'Meteor Header',
    description: 'Hammer every enemy in a wide forward cone with colossal damage and knockback.',
    callout: 'RISE ABOVE',
    iconId: 'ultimate-meteor-header',
    chargeRequired: 100,
    duration: 3,
  }),
  finisher: define({
    id: 'lastTouch',
    characterId: 'finisher',
    name: 'The Last Touch',
    description: 'Strike the greatest threat on the pitch, then enter a clinical finishing window.',
    callout: 'ONE CHANCE IS ENOUGH',
    iconId: 'ultimate-last-touch',
    chargeRequired: 100,
    duration: 5,
  }),
  engine: define({
    id: 'fullPitchPress',
    characterId: 'engine',
    name: 'Full-Pitch Press',
    description: 'Cover impossible ground, vacuum Blood XP, and batter the entire midfield in pulses.',
    callout: 'EVERY BLADE OF GRASS',
    iconId: 'ultimate-full-pitch-press',
    chargeRequired: 100,
    duration: 9,
  }),
  guardian: define({
    id: 'cleanSheet',
    characterId: 'guardian',
    name: 'Clean Sheet',
    description: 'Raise an aegis that sharply reduces damage and steadily restores health.',
    callout: 'NOTHING GETS THROUGH',
    iconId: 'ultimate-clean-sheet',
    chargeRequired: 100,
    duration: 8,
  }),
} satisfies Record<CharacterId, CharacterUltimateDefinition>);

function define(definition: CharacterUltimateDefinition): Readonly<CharacterUltimateDefinition> {
  return Object.freeze({ ...definition });
}
