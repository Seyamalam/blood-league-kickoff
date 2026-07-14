import type { EvolutionDefinition, EvolutionId } from './types';

/** Automatic cross-weapon evolutions for the complete jam build. */
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
  graveFrostWake: define({
    id: 'graveFrostWake',
    name: 'Grave-Frost Wake',
    description: 'The garlic trail freezes every enemy caught in its cursed wake.',
    requirements: [
      { upgradeId: 'garlicTrail', minStacks: 1 },
      { upgradeId: 'frostCleats', minStacks: 1 },
    ],
    modifierBonus: {
      garlicTrailDamage: 4,
      garlicSlowAmount: 0.28,
      garlicSlowDuration: 1.6,
    },
  }),
  stormHalo: define({
    id: 'stormHalo',
    name: 'Storm Halo',
    description: 'Spectral orbiters unleash lightning chains on every fresh collision.',
    requirements: [
      { upgradeId: 'orbitingSpectralBall', minStacks: 1 },
      { upgradeId: 'stormStuds', minStacks: 1 },
    ],
    modifierBonus: {
      orbitingBallDamage: 4,
      orbitChainDamage: 6,
      orbitChainTargets: 2,
    },
  }),
  phantomSingularity: define({
    id: 'phantomSingularity',
    name: 'Phantom Singularity',
    description: 'Each ghost pass tears open a gravity well on its first victim.',
    requirements: [
      { upgradeId: 'ghostPass', minStacks: 1 },
      { upgradeId: 'voidGoal', minStacks: 1 },
    ],
    modifierBonus: {
      ghostPassDamageMultiplier: 0.15,
      ghostVoidDamage: 2,
      ghostVoidRadius: 0.25,
      ghostVoidPullStrength: 5,
      ghostVoidDuration: 1.2,
    },
  }),
  thunderclapRush: define({
    id: 'thunderclapRush',
    name: 'Thunderclap Rush',
    description: 'Storm-charged dashes erupt across a wider area with brutal knockback.',
    requirements: [
      { upgradeId: 'dashShockwave', minStacks: 1 },
      { upgradeId: 'stormStuds', minStacks: 1 },
    ],
    modifierBonus: {
      dashShockwaveDamage: 12,
      dashShockwaveRadius: 0.8,
      dashShockwaveKnockback: 4,
    },
  }),
  sacredAegis: define({
    id: 'sacredAegis',
    name: 'Sacred Aegis',
    description: 'Your ward recharges faster while consecrated zones burn brighter and longer.',
    requirements: [
      { upgradeId: 'consecratedPitch', minStacks: 1 },
      { upgradeId: 'bloodBarrier', minStacks: 1 },
    ],
    modifierBonus: {
      holyZoneDamage: 4,
      holyZoneRadius: 0.4,
      holyZoneDuration: 1.4,
      bloodBarrierRechargeMultiplier: -0.2,
    },
  }),
} satisfies Record<EvolutionId, EvolutionDefinition>);

function define(definition: EvolutionDefinition): Readonly<EvolutionDefinition> {
  return Object.freeze({
    ...definition,
    requirements: Object.freeze(
      definition.requirements.map((requirement) => Object.freeze({ ...requirement })),
    ),
    modifierBonus: Object.freeze({ ...definition.modifierBonus }),
  });
}
