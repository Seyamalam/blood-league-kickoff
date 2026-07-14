import type { CurseDefinition, CurseId } from './types';

/** Optional pre-run contracts. Each one exposes its upside and cost independently for UI clarity. */
export const CURSE_DEFINITIONS = Object.freeze({
  bloodMoonPact: define({
    id: 'bloodMoonPact',
    name: 'Blood Moon Pact',
    description: 'Trade safety for a relentless vampiric attack.',
    benefit: '+40% damage and stronger healing from primary kills.',
    drawback: 'Take 25% more damage; enemies have 20% more health.',
    benefitModifiers: { allDamageMultiplier: 0.4, lifeStealOnPrimaryKill: 0.8 },
    drawbackModifiers: { damageTakenMultiplier: 0.25 },
    directorModifiers: { enemyHealthMultiplier: 1.2, rewardMultiplier: 1.18 },
  }),
  glassGoal: define({
    id: 'glassGoal',
    name: 'Glass Goal',
    description: 'Every shot becomes a highlight-reel cannon at a brutal defensive cost.',
    benefit: '+70% ball damage and +25% kick power.',
    drawback: '-35 maximum health and take 20% more damage.',
    benefitModifiers: { ballDamageMultiplier: 0.7, kickPowerMultiplier: 0.25 },
    drawbackModifiers: { maxHealthBonus: -35, damageTakenMultiplier: 0.2 },
    directorModifiers: { rewardMultiplier: 1.16 },
  }),
  hungryPitch: define({
    id: 'hungryPitch',
    name: 'Hungry Pitch',
    description: 'The turf drags blood toward you while the horde closes in faster.',
    benefit: '+70% pickup range and improved secondary-weapon healing.',
    drawback: '-15% movement speed; enemies move 15% faster.',
    benefitModifiers: { pickupRadiusMultiplier: 0.7, lifeStealOnSecondaryKill: 0.5 },
    drawbackModifiers: { movementSpeedMultiplier: -0.15 },
    directorModifiers: { enemySpeedMultiplier: 1.15, rewardMultiplier: 1.14 },
  }),
  suddenDeath: define({
    id: 'suddenDeath',
    name: 'Sudden Death',
    description: 'End the match quickly—or be ended by it.',
    benefit: '+55% total damage and +40% damage against elites.',
    drawback: 'Take 50% more damage; the goalkeeper has 35% more health.',
    benefitModifiers: { allDamageMultiplier: 0.55, eliteDamageMultiplier: 0.4 },
    drawbackModifiers: { damageTakenMultiplier: 0.5 },
    directorModifiers: { bossHealthMultiplier: 1.35, rewardMultiplier: 1.25 },
  }),
  offsideTrap: define({
    id: 'offsideTrap',
    name: 'Offside Trap',
    description: 'Dash through crowded lines while the next wave arrives early.',
    benefit: '30% faster dashes and +35% secondary-weapon damage.',
    drawback: '25% slower recall and enemies spawn 20% faster.',
    benefitModifiers: { dashCooldownMultiplier: -0.3, secondaryDamageMultiplier: 0.35 },
    drawbackModifiers: { recallCooldownMultiplier: 0.25 },
    directorModifiers: { spawnRateMultiplier: 1.2, rewardMultiplier: 1.17 },
  }),
  cursedCrowd: define({
    id: 'cursedCrowd',
    name: 'Cursed Crowd',
    description: 'The roaring stands protect you, but demand a longer, bloodier show.',
    benefit: '+35 maximum health and one Blood Barrier charge.',
    drawback: '-18% total damage and +12% elite chance.',
    benefitModifiers: { maxHealthBonus: 35, bloodBarrierCharges: 1 },
    drawbackModifiers: { allDamageMultiplier: -0.18 },
    directorModifiers: { eliteChanceBonus: 0.12, rewardMultiplier: 1.2 },
  }),
} satisfies Record<CurseId, CurseDefinition>);

function define(definition: CurseDefinition): Readonly<CurseDefinition> {
  return Object.freeze({
    ...definition,
    benefitModifiers: Object.freeze({ ...definition.benefitModifiers }),
    drawbackModifiers: Object.freeze({ ...definition.drawbackModifiers }),
    directorModifiers: Object.freeze({ ...definition.directorModifiers }),
  });
}
