import { describe, expect, it } from 'vitest';
import {
  COUNT_GOALKEEPER_COMBAT_TARGET_ID,
  damageCountGoalkeeper,
  didDefeatCountGoalkeeper,
  spawnCountGoalkeeper,
} from '../boss';
import { createMatchDirectorState, FULL_MATCH_CONFIG, updateMatchDirector } from '../match';
import { createGameState, damageEnemiesWithSecondary } from '../simulation/gameState';
import type { SecondaryDamageHit, SecondaryDamageSource } from './types';
import { SecondaryWeaponSystem } from './SecondaryWeaponSystem';
import { MAX_SECONDARY_BOSS_DAMAGE_PER_STEP, sumSecondaryBossDamage } from './secondaryBossDamage';

const BOSS_ID = -1;
const POSITION = Object.freeze({ x: 0, y: 1.15, z: -11 });
const SOURCES = [
  'garlic-trail',
  'spectral-ball',
  'blood-bomb',
  'ghost-pass',
  'chain-lightning',
  'frost-burst',
  'multi-ball',
  'black-hole',
] as const satisfies readonly SecondaryDamageSource[];

describe('sumSecondaryBossDamage', () => {
  it('accepts positive finite damage from every secondary damage source', () => {
    const hits = SOURCES.map((source) => hit(BOSS_ID, 1, source));

    const result = sumSecondaryBossDamage(hits, BOSS_ID);

    expect(result).toBe(8);
    expect(typeof result).toBe('number');
  });

  it('ignores hits for ordinary targets and non-positive or non-finite damage', () => {
    const hits: SecondaryDamageHit[] = [
      hit(42, 6, 'blood-bomb'),
      hit(BOSS_ID, 0, 'garlic-trail'),
      hit(BOSS_ID, -3, 'spectral-ball'),
      hit(BOSS_ID, Number.NaN, 'ghost-pass'),
      hit(BOSS_ID, Number.POSITIVE_INFINITY, 'chain-lightning'),
      hit(BOSS_ID, Number.NEGATIVE_INFINITY, 'frost-burst'),
      hit(BOSS_ID, 2.5, 'multi-ball'),
    ];

    expect(sumSecondaryBossDamage(hits, BOSS_ID)).toBe(2.5);
  });

  it('clamps accumulated damage to the per-step boss ceiling', () => {
    const hits = SOURCES.map((source) => hit(BOSS_ID, 4, source));

    expect(sumSecondaryBossDamage(hits, BOSS_ID)).toBe(MAX_SECONDARY_BOSS_DAMAGE_PER_STEP);
    expect(MAX_SECONDARY_BOSS_DAMAGE_PER_STEP).toBe(12);
  });

  it('returns zero for an empty hit list or when no target ID matches', () => {
    expect(sumSecondaryBossDamage([], BOSS_ID)).toBe(0);
    expect(sumSecondaryBossDamage([hit(BOSS_ID, 5, 'black-hole')], 999)).toBe(0);
  });

  it('routes persistent and triggered secondary effects to the boss without ordinary rewards', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = {
      garlicTrailDamage: 4,
      orbitingBallCount: 0,
      orbitingBallDamage: 0,
      bloodBombDamage: 5,
      bloodBombRadius: 0.5,
      ghostPassCount: 0,
      ghostPassDamageMultiplier: 1,
      chainLightningDamage: 0,
      chainLightningTargets: 0,
      frostBurstDamage: 0,
      frostBurstRadius: 0,
      frostSlowAmount: 0,
      frostSlowDuration: 0,
      garlicSlowAmount: 0,
      garlicSlowDuration: 0,
      multiBallCount: 0,
      multiBallDamageMultiplier: 0,
      orbitChainDamage: 0,
      orbitChainTargets: 0,
      blackHoleDamage: 3,
      blackHoleRadius: 0.5,
      blackHolePullStrength: 0,
      blackHoleDuration: 1,
      ghostVoidDamage: 0,
      ghostVoidRadius: 0,
      ghostVoidPullStrength: 0,
      ghostVoidDuration: 0,
    };
    const bossTarget = {
      id: COUNT_GOALKEEPER_COMBAT_TARGET_ID,
      position: { x: 0, y: 1.15, z: 0 },
      radius: 1.15,
    };
    system.triggerBloodBomb(bossTarget.position, modifiers);
    system.triggerBlackHole(bossTarget.position, modifiers);
    const step = system.step({
      dt: 1 / 60,
      playerPosition: { x: 5, y: 0.9, z: 5 },
      ballPosition: bossTarget.position,
      ballSpeed: 10,
      ballInFlight: true,
      ballReturning: false,
      modifiers,
      targets: [bossTarget],
    });

    expect(new Set(step.hits.map((candidate) => candidate.source))).toEqual(
      new Set(['garlic-trail', 'blood-bomb', 'black-hole']),
    );
    const rawBossDamage = sumSecondaryBossDamage(step.hits, COUNT_GOALKEEPER_COMBAT_TARGET_ID);
    expect(rawBossDamage).toBe(12);

    const game = createGameState();
    const ordinary = damageEnemiesWithSecondary(game, step.hits, COUNT_GOALKEEPER_COMBAT_TARGET_ID);
    expect(ordinary).toMatchObject({ hits: 0, kills: 0 });
    expect(game.score).toBe(0);
    expect(game.kills).toBe(0);

    const guarding = {
      ...spawnCountGoalkeeper({ seed: 123 }),
      phase: 'guarding' as const,
      phaseElapsed: 0,
    };
    const damage = damageCountGoalkeeper(guarding, { amount: rawBossDamage, source: 'secondary' });
    expect(damage.appliedDamage).toBeCloseTo(4.8);
  });

  it('forwards a secondary defeat into final-wave victory in the same integration step', () => {
    const guarding = {
      ...spawnCountGoalkeeper({ seed: 123 }),
      phase: 'guarding' as const,
      phaseElapsed: 0,
      health: 3,
    };
    const damage = damageCountGoalkeeper(guarding, {
      amount: MAX_SECONDARY_BOSS_DAMAGE_PER_STEP,
      source: 'secondary',
    });
    const match = {
      ...createMatchDirectorState(),
      stage: 'finalWave' as const,
      matchElapsed: 500,
      totalKills: 285,
      goalScored: true,
      goalsScored: 2,
    };
    const update = updateMatchDirector(
      match,
      {
        dt: 1 / 60,
        totalKills: match.totalKills,
        playerDead: false,
        goalScored: false,
        bossDefeated: didDefeatCountGoalkeeper(damage.events),
      },
      FULL_MATCH_CONFIG,
    );

    expect(damage.state.phase).toBe('defeated');
    expect(update.state.stage).toBe('victory');
    expect(update.events).toContainEqual({ type: 'victory' });
  });
});

function hit(targetId: number, damage: number, source: SecondaryDamageSource): SecondaryDamageHit {
  return { targetId, damage, source, position: POSITION };
}
