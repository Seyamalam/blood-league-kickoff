import type { UpgradeDefinition, UpgradeId } from './types';

/** The eight guaranteed GameJam upgrades. Runtime state is stored separately. */
export const UPGRADE_DEFINITIONS = Object.freeze({
  silverBall: define({
    id: 'silverBall',
    name: 'Silver Ball',
    description: '+22% ball damage.',
    maxStacks: 5,
    minPlayerLevel: 1,
    prerequisites: [],
    modifierPerStack: { ballDamageMultiplier: 0.22 },
  }),
  powerKick: define({
    id: 'powerKick',
    name: 'Power Kick',
    description: 'Harder, faster kicks with stronger knockback.',
    maxStacks: 5,
    minPlayerLevel: 1,
    prerequisites: [],
    modifierPerStack: {
      kickPowerMultiplier: 0.16,
      ballSpeedMultiplier: 0.08,
      knockbackMultiplier: 0.15,
    },
  }),
  rapidRecall: define({
    id: 'rapidRecall',
    name: 'Rapid Recall',
    description: 'Recall the ball faster and more often.',
    maxStacks: 4,
    minPlayerLevel: 1,
    prerequisites: [],
    modifierPerStack: {
      recallSpeedMultiplier: 0.18,
      recallCooldownMultiplier: -0.1,
    },
  }),
  piercingStuds: define({
    id: 'piercingStuds',
    name: 'Piercing Studs',
    description: 'The ball penetrates one additional enemy.',
    maxStacks: 4,
    minPlayerLevel: 2,
    prerequisites: [{ upgradeId: 'silverBall', minStacks: 1 }],
    modifierPerStack: { pierceCount: 1 },
  }),
  garlicTrail: define({
    id: 'garlicTrail',
    name: 'Garlic Trail',
    description: 'The ball leaves a damaging garlic wake.',
    maxStacks: 5,
    minPlayerLevel: 2,
    prerequisites: [],
    modifierPerStack: { garlicTrailDamage: 4 },
  }),
  orbitingSpectralBall: define({
    id: 'orbitingSpectralBall',
    name: 'Orbiting Spectral Ball',
    description: 'Summon a protective ball that circles the striker.',
    maxStacks: 3,
    minPlayerLevel: 3,
    prerequisites: [],
    modifierPerStack: {
      orbitingBallCount: 1,
      orbitingBallDamage: 7,
    },
  }),
  bloodBomb: define({
    id: 'bloodBomb',
    name: 'Blood Bomb',
    description: 'Powerful impacts erupt in a blood explosion.',
    maxStacks: 4,
    minPlayerLevel: 3,
    prerequisites: [{ upgradeId: 'powerKick', minStacks: 1 }],
    modifierPerStack: {
      bloodBombDamage: 8,
      bloodBombRadius: 0.35,
    },
  }),
  ghostPass: define({
    id: 'ghostPass',
    name: 'Ghost Pass',
    description: 'A spectral teammate duplicates a returning shot.',
    maxStacks: 3,
    minPlayerLevel: 3,
    prerequisites: [{ upgradeId: 'rapidRecall', minStacks: 1 }],
    modifierPerStack: {
      ghostPassCount: 1,
      ghostPassDamageMultiplier: 0.12,
    },
  }),
} satisfies Record<UpgradeId, UpgradeDefinition>);

function define(definition: UpgradeDefinition): Readonly<UpgradeDefinition> {
  return Object.freeze({
    ...definition,
    prerequisites: Object.freeze(definition.prerequisites.map((requirement) => Object.freeze({ ...requirement }))),
    modifierPerStack: Object.freeze({ ...definition.modifierPerStack }),
  });
}
