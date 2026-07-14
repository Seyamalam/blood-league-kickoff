import { describe, expect, it } from 'vitest';
import { FootballArmorySystem } from './FootballArmorySystem';
import type { FootballArmoryModifiers, FootballArmoryTarget } from './footballArmoryTypes';

const ZERO_MODIFIERS: FootballArmoryModifiers = {
  headerCannonDamage: 0,
  headerCannonRadius: 0,
  headerCannonKnockback: 0,
  cornerStormDamage: 0,
  cornerStormStrikes: 0,
  cornerStormInterval: 1,
  redCardDamage: 0,
  redCardExecuteThreshold: 0,
  redCardStunDuration: 0,
  spectralTeammateCount: 0,
  spectralTeammateDamage: 0,
  spectralTeammateInterval: 1,
  penaltyMineDamage: 0,
  penaltyMineRadius: 0,
  penaltyMineCount: 0,
  bootCycloneDamage: 0,
  bootCycloneRadius: 0,
  bootCycloneInterval: 1,
};

const TARGETS: FootballArmoryTarget[] = [
  { id: 1, position: { x: 0, y: 0, z: 2 }, radius: 0.4, healthRatio: 0.8 },
  { id: 2, position: { x: 1, y: 0, z: 3 }, radius: 0.4, healthRatio: 0.05 },
  { id: 3, position: { x: 4, y: 0, z: 0 }, radius: 0.4, healthRatio: 0.4 },
];

describe('FootballArmorySystem', () => {
  it('fires a bounded forward header and reports knockback', () => {
    const system = new FootballArmorySystem();
    const modifiers = withModifiers({
      headerCannonDamage: 20,
      headerCannonRadius: 0.4,
      headerCannonKnockback: 3,
    });
    expect(system.triggerHeader({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, modifiers)).toBe(true);
    const result = system.step(stepInput(modifiers));

    expect(result.hits.map(({ targetId, source }) => [targetId, source])).toEqual([
      [1, 'header-cannon'],
      [2, 'header-cannon'],
    ]);
    expect(result.events.filter(({ type }) => type === 'header-knockback')).toHaveLength(2);
  });

  it('runs corner strikes and teammate volleys against deterministic nearest targets', () => {
    const system = new FootballArmorySystem();
    const modifiers = withModifiers({
      cornerStormDamage: 9,
      cornerStormStrikes: 2,
      spectralTeammateCount: 2,
      spectralTeammateDamage: 6,
    });
    const result = system.step(stepInput(modifiers));

    expect(
      result.hits.filter(({ source }) => source === 'corner-storm').map(({ targetId }) => targetId),
    ).toEqual([1, 2]);
    expect(
      result.hits.filter(({ source }) => source === 'spectral-teammate').map(({ targetId }) => targetId),
    ).toEqual([1, 2]);
  });

  it('executes targets below the Red Card threshold and stuns healthier targets', () => {
    const system = new FootballArmorySystem();
    const execute = system.step(
      stepInput(
        withModifiers({
          redCardDamage: 8,
          redCardExecuteThreshold: 0.1,
          redCardStunDuration: 0.7,
        }),
      ),
    );
    expect(execute.hits.find(({ source }) => source === 'red-card')).toMatchObject({
      targetId: 2,
      damage: 10_000,
    });
    expect(execute.events.find(({ type }) => type === 'red-card')).toMatchObject({
      executed: true,
      stunDuration: 0.7,
    });

    system.reset();
    const healthyTargets = TARGETS.map((target) => ({ ...target, healthRatio: 0.8 }));
    const stun = system.step({
      ...stepInput(withModifiers({ redCardDamage: 8, redCardExecuteThreshold: 0.1 })),
      targets: healthyTargets,
    });
    expect(stun.hits.find(({ source }) => source === 'red-card')).toMatchObject({ targetId: 1, damage: 8 });
  });

  it('plants fixed-pool mines and detonates an armed mine on overlap', () => {
    const system = new FootballArmorySystem();
    const modifiers = withModifiers({ penaltyMineCount: 1, penaltyMineDamage: 14, penaltyMineRadius: 0.5 });
    const empty = { ...stepInput(modifiers), targets: [] };
    const planted = system.step(empty);
    const mine = planted.penaltyMines.find(({ active }) => active)!;
    expect(mine).toBeDefined();
    expect(planted.events.some(({ type }) => type === 'penalty-mine-planted')).toBe(true);

    for (let tick = 0; tick < 5; tick += 1) system.step({ ...empty, dt: 0.1 });
    const target = { id: 9, position: { ...mine.position }, radius: 0.2 };
    const detonated = system.step({ ...empty, targets: [target] });
    expect(detonated.hits).toContainEqual(
      expect.objectContaining({ targetId: 9, damage: 14, source: 'penalty-mine' }),
    );
    expect(detonated.events.some(({ type }) => type === 'penalty-mine-detonated')).toBe(true);
  });

  it('pulses Boot Cyclone only against targets inside its ring', () => {
    const system = new FootballArmorySystem();
    const result = system.step(stepInput(withModifiers({ bootCycloneDamage: 5, bootCycloneRadius: 0.7 })));
    expect(
      result.hits.filter(({ source }) => source === 'boot-cyclone').map(({ targetId }) => targetId),
    ).toEqual([1]);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'boot-cyclone', radius: 2.3 }));
  });

  it('does nothing for locked weapon paths and rejects invalid header directions', () => {
    const system = new FootballArmorySystem();
    expect(system.triggerHeader({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, ZERO_MODIFIERS)).toBe(false);
    const result = system.step(stepInput(ZERO_MODIFIERS));
    expect(result.hits).toEqual([]);
    expect(result.events).toEqual([]);
  });
});

function withModifiers(values: Partial<FootballArmoryModifiers>): FootballArmoryModifiers {
  return { ...ZERO_MODIFIERS, ...values };
}

function stepInput(modifiers: FootballArmoryModifiers) {
  return { dt: 0.016, playerPosition: { x: 0, y: 0, z: 0 }, modifiers, targets: TARGETS };
}
