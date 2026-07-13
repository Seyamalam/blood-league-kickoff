import { describe, expect, it } from 'vitest';
import { SecondaryWeaponSystem, type SecondaryCombatModifiers } from './index';

const EMPTY: SecondaryCombatModifiers = {
  garlicTrailDamage: 0,
  orbitingBallCount: 0,
  orbitingBallDamage: 0,
  bloodBombDamage: 0,
  bloodBombRadius: 0,
  ghostPassCount: 0,
  ghostPassDamageMultiplier: 1,
  chainLightningDamage: 0,
  chainLightningTargets: 0,
};

describe('SecondaryWeaponSystem', () => {
  it('applies queued blood-bomb area damage', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = { ...EMPTY, bloodBombDamage: 8, bloodBombRadius: 0.5 };
    system.triggerBloodBomb({ x: 0, y: 0.9, z: 0 }, modifiers);
    const result = system.step({
      dt: 1 / 60,
      playerPosition: { x: 5, y: 0.9, z: 5 },
      ballPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 0,
      ballInFlight: false,
      ballReturning: false,
      modifiers,
      targets: [{ id: 1, position: { x: 0.4, y: 0.9, z: 0 }, radius: 0.5 }],
    });
    expect(result.hits).toContainEqual(
      expect.objectContaining({ targetId: 1, damage: 8, source: 'blood-bomb' }),
    );
  });

  it('spawns ghost passes on recall edge', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = { ...EMPTY, ghostPassCount: 2, ghostPassDamageMultiplier: 1.2 };
    system.step({
      dt: 1 / 60,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballPosition: { x: 0, y: 0.9, z: -4 },
      ballSpeed: 10,
      ballInFlight: true,
      ballReturning: true,
      modifiers,
      targets: [],
    });
    expect(system.renderState.ghostPasses.filter((ghost) => ghost.active)).toHaveLength(2);
  });

  it('chains deterministically through nearest unvisited targets', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = { ...EMPTY, chainLightningDamage: 9, chainLightningTargets: 3 };
    expect(system.triggerChainLightning(1, { x: 0, y: 0.9, z: 0 }, modifiers)).toBe(true);
    const result = system.step({
      dt: 1 / 60,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 0,
      ballInFlight: false,
      ballReturning: false,
      modifiers,
      targets: [
        { id: 1, position: { x: 0, y: 0.9, z: 0 }, radius: 0.5 },
        { id: 10, position: { x: 6, y: 0.9, z: 0 }, radius: 0.5 },
        { id: 30, position: { x: 3, y: 0.9, z: 0 }, radius: 0.5 },
        { id: 20, position: { x: 2, y: 0.9, z: 0 }, radius: 0.5 },
      ],
    });

    expect(result.hits.map((hit) => hit.targetId)).toEqual([20, 30, 10]);
    expect(result.hits.every((hit) => hit.damage === 9 && hit.source === 'chain-lightning')).toBe(true);
    expect(result.events.filter((event) => event.type === 'chain-lightning-hit')).toHaveLength(3);
  });

  it('uses stable IDs for equal-distance ties and stops outside chain range', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = { ...EMPTY, chainLightningDamage: 5, chainLightningTargets: 4 };
    system.triggerChainLightning(1, { x: 0, y: 0.9, z: 0 }, modifiers);
    const result = system.step({
      dt: 1 / 60,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 0,
      ballInFlight: false,
      ballReturning: false,
      modifiers,
      targets: [
        { id: 9, position: { x: 3, y: 0.9, z: 0 }, radius: 0.5 },
        { id: 2, position: { x: -3, y: 0.9, z: 0 }, radius: 0.5 },
        { id: 50, position: { x: 20, y: 0.9, z: 0 }, radius: 0.5 },
      ],
    });

    expect(result.hits.map((hit) => hit.targetId)).toEqual([2]);
  });
});
