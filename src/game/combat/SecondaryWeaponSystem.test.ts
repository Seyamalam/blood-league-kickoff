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
});
