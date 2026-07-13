import type { EvolutionDefinition, EvolutionId } from './types';

/** The two automatic weapon evolutions required for the jam build. */
export const EVOLUTION_DEFINITIONS = Object.freeze({
  moonBreaker: define({
    id: 'moonBreaker',
    name: 'Moon Breaker',
    description: 'Silver force shatters the horde with greater damage and penetration.',
    requirements: [
      { upgradeId: 'silverBall', minStacks: 1 },
      { upgradeId: 'piercingStuds', minStacks: 1 },
    ],
    modifierBonus: {
      ballDamageMultiplier: 0.65,
      pierceCount: 2,
    },
  }),
  crimsonMeteor: define({
    id: 'crimsonMeteor',
    name: 'Crimson Meteor',
    description: 'Power kicks detonate larger, stronger blood eruptions.',
    requirements: [
      { upgradeId: 'bloodBomb', minStacks: 1 },
      { upgradeId: 'powerKick', minStacks: 1 },
    ],
    modifierBonus: {
      bloodBombDamage: 12,
      bloodBombRadius: 0.75,
      kickPowerMultiplier: 0.25,
      ballSpeedMultiplier: 0.12,
    },
  }),
} satisfies Record<EvolutionId, EvolutionDefinition>);

function define(definition: EvolutionDefinition): Readonly<EvolutionDefinition> {
  return Object.freeze({
    ...definition,
    requirements: Object.freeze(definition.requirements.map((requirement) => Object.freeze({ ...requirement }))),
    modifierBonus: Object.freeze({ ...definition.modifierBonus }),
  });
}
