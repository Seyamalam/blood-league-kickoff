import type { CharacterDefinition, CharacterId } from './types';

/** Original football archetypes with no real-player names, likenesses, clubs, or kit trade dress. */
export const CHARACTER_DEFINITIONS = Object.freeze({
  maestro: define({
    id: 'maestro',
    name: 'The Maestro',
    role: 'Technical Playmaker',
    description: 'Bends impossible passes through the night and controls every return.',
    strength: 'Curve, recall, and perfect volleys',
    weakness: 'Lower raw kick power',
    startingUpgradeAffinity: 'rapidRecall',
    modifierBonus: {
      curveStrengthMultiplier: 0.2,
      recallSpeedMultiplier: 0.15,
      volleyWindowBonus: 0.2,
      kickPowerMultiplier: -0.1,
    },
    visualStyle: { primaryColor: 0xe8e1c7, accentColor: 0x6f4bc6, bootColor: 0xc72f62 },
  }),
  breakaway: define({
    id: 'breakaway',
    name: 'The Breakaway',
    role: 'Explosive Runner',
    description: 'Turns one open lane into a devastating counterattack.',
    strength: 'Movement and frequent dashes',
    weakness: 'Lower maximum health',
    startingUpgradeAffinity: 'powerKick',
    modifierBonus: {
      movementSpeedMultiplier: 0.12,
      dashCooldownMultiplier: -0.2,
      maxHealthBonus: -15,
    },
    visualStyle: { primaryColor: 0xd9e4ef, accentColor: 0x2475d8, bootColor: 0xf0c333 },
  }),
  tower: define({
    id: 'tower',
    name: 'The Tower',
    role: 'Power Striker',
    description: 'Overwhelms the goalmouth with strength, reach, and thunderous shots.',
    strength: 'Health, kick power, and knockback',
    weakness: 'Slower movement',
    startingUpgradeAffinity: 'powerKick',
    modifierBonus: {
      maxHealthBonus: 25,
      kickPowerMultiplier: 0.18,
      knockbackMultiplier: 0.2,
      movementSpeedMultiplier: -0.1,
    },
    visualStyle: { primaryColor: 0x25222f, accentColor: 0xd6a632, bootColor: 0xb5123f },
  }),
  finisher: define({
    id: 'finisher',
    name: 'The Finisher',
    role: 'Penalty-Box Hunter',
    description: 'Finds the decisive strike when elites and keepers close the angle.',
    strength: 'Direct shots against elite threats',
    weakness: 'Weaker secondary weapons',
    startingUpgradeAffinity: 'silverBall',
    modifierBonus: {
      ballDamageMultiplier: 0.1,
      eliteDamageMultiplier: 0.15,
      secondaryDamageMultiplier: -0.1,
    },
    visualStyle: { primaryColor: 0xe5d8d4, accentColor: 0xb5123f, bootColor: 0xefe5a2 },
  }),
  engine: define({
    id: 'engine',
    name: 'The Engine',
    role: 'Relentless Runner',
    description: 'Covers the entire pitch and gathers every drop of momentum.',
    strength: 'Pickup range and movement',
    weakness: 'Lower starting damage',
    startingUpgradeAffinity: 'garlicTrail',
    modifierBonus: {
      pickupRadiusMultiplier: 0.35,
      movementSpeedMultiplier: 0.07,
      allDamageMultiplier: -0.08,
    },
    visualStyle: { primaryColor: 0xcfd8d0, accentColor: 0x248c68, bootColor: 0xd8e239 },
  }),
  guardian: define({
    id: 'guardian',
    name: 'The Guardian',
    role: 'Defensive Anchor',
    description: 'Holds the line when the cursed crowd closes from every side.',
    strength: 'Damage resistance',
    weakness: 'Lower kick power',
    startingUpgradeAffinity: 'orbitingSpectralBall',
    modifierBonus: {
      damageTakenMultiplier: -0.18,
      kickPowerMultiplier: -0.1,
    },
    visualStyle: { primaryColor: 0xc7d0d8, accentColor: 0x46566f, bootColor: 0x8fa8bf },
  }),
} satisfies Record<CharacterId, CharacterDefinition>);

function define(definition: CharacterDefinition): Readonly<CharacterDefinition> {
  return Object.freeze({
    ...definition,
    modifierBonus: Object.freeze({ ...definition.modifierBonus }),
    visualStyle: Object.freeze({ ...definition.visualStyle }),
  });
}
