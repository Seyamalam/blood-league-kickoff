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
  frostBurstDamage: 0,
  frostBurstRadius: 0,
  frostSlowAmount: 0,
  frostSlowDuration: 0,
  multiBallCount: 0,
  multiBallDamageMultiplier: 0,
  blackHoleDamage: 0,
  blackHoleRadius: 0,
  blackHolePullStrength: 0,
  blackHoleDuration: 0,
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

  it('applies deterministic frost damage and reports bounded slow metadata', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = {
      ...EMPTY,
      frostBurstDamage: 7,
      frostBurstRadius: 0.5,
      frostSlowAmount: 0.3,
      frostSlowDuration: 2.25,
    };
    expect(system.triggerFrostBurst({ x: 0, y: 0.9, z: 0 }, modifiers)).toBe(true);
    const targets = Array.from({ length: 16 }, (_, index) => ({
      id: 16 - index,
      position: { x: 1, y: 0.9, z: 0 },
      radius: 0.5,
    }));
    targets.push({ id: 50, position: { x: 5, y: 0.9, z: 0 }, radius: 0.5 });
    const result = system.step({
      dt: 1 / 60,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 0,
      ballInFlight: false,
      ballReturning: false,
      modifiers,
      targets,
    });

    expect(result.hits.filter((hit) => hit.source === 'frost-burst').map((hit) => hit.targetId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    const frostHit = result.events.find((event) => event.type === 'frost-burst-hit');
    expect(frostHit).toMatchObject({ speedMultiplier: 0.7, duration: 2.25 });
  });

  it('does not queue frost bursts without frost damage', () => {
    expect(new SecondaryWeaponSystem().triggerFrostBurst({ x: 0, y: 0, z: 0 }, EMPTY)).toBe(false);
  });

  it('spawns a deterministic symmetric multiball fan in a bounded pool', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = { ...EMPTY, multiBallCount: 3, multiBallDamageMultiplier: 0.5 };
    const trigger = {
      origin: { x: 0, y: 0.9, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      baseDamage: 10,
      modifiers,
    };

    expect(system.triggerMultiBall(trigger)).toBe(3);
    const firstFan = system.renderState.multiBallShots.filter((shot) => shot.active);
    expect(firstFan).toHaveLength(3);
    expect(firstFan[0]!.velocity.z).toBeCloseTo(-firstFan[2]!.velocity.z);
    expect(firstFan[1]!.velocity.z).toBeCloseTo(0);

    system.triggerMultiBall({ ...trigger, modifiers: { ...modifiers, multiBallCount: 4 } });
    expect(system.renderState.multiBallShots.filter((shot) => shot.active)).toHaveLength(6);
  });

  it('deals duplicate-shot damage once per target', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = { ...EMPTY, multiBallCount: 1, multiBallDamageMultiplier: 0.6 };
    expect(
      system.triggerMultiBall({
        origin: { x: 0, y: 0.9, z: 0 },
        direction: { x: 1, y: 0, z: 0 },
        baseDamage: 10,
        modifiers,
      }),
    ).toBe(1);
    const input = {
      dt: 0.05,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 0,
      ballInFlight: false,
      ballReturning: false,
      modifiers,
      targets: [{ id: 4, position: { x: 1.1, y: 0.9, z: 0 }, radius: 0.2 }],
    };

    const first = system.step(input);
    expect(first.hits).toContainEqual(
      expect.objectContaining({ targetId: 4, damage: 6, source: 'multi-ball' }),
    );
    expect(first.events).toContainEqual(expect.objectContaining({ type: 'multi-ball-spawned', count: 1 }));
    expect(system.step({ ...input, dt: 0 }).hits).toHaveLength(0);
  });

  it('pulses deterministic bounded black-hole damage and typed pull forces', () => {
    const system = new SecondaryWeaponSystem();
    const modifiers = {
      ...EMPTY,
      blackHoleDamage: 4,
      blackHoleRadius: 0.4,
      blackHolePullStrength: 6,
      blackHoleDuration: 1,
    };
    expect(system.triggerBlackHole({ x: 0, y: 0.9, z: 0 }, modifiers)).toBe(true);
    const targets = Array.from({ length: 20 }, (_, index) => ({
      id: 20 - index,
      position: { x: 1, y: 0.9, z: 0 },
      radius: 0.3,
    }));
    targets.push({ id: 50, position: { x: 6, y: 0.9, z: 0 }, radius: 0.3 });
    const input = {
      dt: 1 / 60,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 0,
      ballInFlight: false,
      ballReturning: false,
      modifiers,
      targets,
    };

    const first = system.step(input);
    expect(first.hits.filter((hit) => hit.source === 'black-hole').map((hit) => hit.targetId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    const pull = first.events.find((event) => event.type === 'black-hole-pull' && event.targetId === 1);
    expect(pull).toMatchObject({ force: { x: -6, y: 0, z: 0 } });
    expect(first.events).toContainEqual(
      expect.objectContaining({ type: 'black-hole-spawned', radius: 2, duration: 1 }),
    );
    expect(system.step({ ...input, dt: 0.1 }).hits).toHaveLength(0);
  });

  it('keeps black-hole zones fixed-pool and rejects disabled triggers', () => {
    const system = new SecondaryWeaponSystem();
    expect(system.triggerBlackHole({ x: 0, y: 0, z: 0 }, EMPTY)).toBe(false);
    const modifiers = {
      ...EMPTY,
      blackHolePullStrength: 3,
      blackHoleDuration: 1,
    };
    for (let index = 0; index < 5; index += 1) {
      expect(system.triggerBlackHole({ x: index, y: 0, z: 0 }, modifiers)).toBe(true);
    }
    expect(system.renderState.blackHoleZones.filter((zone) => zone.active)).toHaveLength(4);
  });

  it('stays bounded when every secondary-weapon pool is exhausted', () => {
    const system = new SecondaryWeaponSystem();
    const renderState = system.renderState;
    const poolReferences = {
      garlicZones: renderState.garlicZones,
      orbitingBalls: renderState.orbitingBalls,
      ghostPasses: renderState.ghostPasses,
      multiBallShots: renderState.multiBallShots,
      blackHoleZones: renderState.blackHoleZones,
    };
    const modifiers: SecondaryCombatModifiers = {
      ...EMPTY,
      garlicTrailDamage: 4,
      orbitingBallCount: 99,
      orbitingBallDamage: 7,
      bloodBombDamage: 8,
      bloodBombRadius: 0.5,
      ghostPassCount: 3,
      ghostPassDamageMultiplier: 1,
      chainLightningDamage: 6,
      chainLightningTargets: 1,
      frostBurstDamage: 5,
      frostBurstRadius: 0.25,
      frostSlowAmount: 0.1,
      frostSlowDuration: 0.45,
      multiBallCount: 4,
      multiBallDamageMultiplier: 0.5,
      blackHoleDamage: 1,
      blackHoleRadius: 0.25,
      blackHolePullStrength: 3,
      blackHoleDuration: 2,
    };
    const baseStep = {
      dt: 0,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      ballSpeed: 10,
      ballInFlight: true,
      ballReturning: false,
      ballDamage: 10,
      modifiers,
      targets: [],
    };

    for (let index = 0; index < 40; index += 1) {
      system.step({ ...baseStep, ballPosition: { x: index * 1.1, y: 0.9, z: 0 } });
    }
    expect(renderState.garlicZones).toHaveLength(24);
    expect(renderState.garlicZones.filter((zone) => zone.active)).toHaveLength(24);
    expect(renderState.orbitingBalls).toHaveLength(3);
    expect(renderState.orbitingBalls.filter((orbit) => orbit.active)).toHaveLength(3);

    for (let index = 0; index < 10; index += 1) {
      expect(
        system.triggerGhostPass({
          origin: { x: index, y: 0.9, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
          baseDamage: 10,
          modifiers,
        }),
      ).toBe(3);
      expect(
        system.triggerMultiBall({
          origin: { x: index, y: 0.9, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
          baseDamage: 10,
          modifiers,
        }),
      ).toBe(4);
      expect(system.triggerBlackHole({ x: index, y: 0.9, z: 0 }, modifiers)).toBe(true);
    }
    expect(renderState.ghostPasses).toHaveLength(8);
    expect(renderState.ghostPasses.filter((ghost) => ghost.active)).toHaveLength(8);
    expect(renderState.multiBallShots).toHaveLength(6);
    expect(renderState.multiBallShots.filter((shot) => shot.active)).toHaveLength(6);
    expect(renderState.blackHoleZones).toHaveLength(4);
    expect(renderState.blackHoleZones.filter((zone) => zone.active)).toHaveLength(4);

    for (let index = 0; index < 20; index += 1) {
      expect(system.triggerBloodBomb({ x: index, y: 0.9, z: 0 }, modifiers)).toBe(true);
    }
    const bombStep = system.step({
      ...baseStep,
      ballInFlight: false,
      ballPosition: { x: 0, y: 0.9, z: 0 },
    });
    expect(bombStep.events.filter((event) => event.type === 'blood-bomb-triggered')).toHaveLength(8);

    for (let index = 0; index < 20; index += 1) {
      expect(system.triggerChainLightning(1, { x: index, y: 0.9, z: 0 }, modifiers)).toBe(true);
      expect(system.triggerFrostBurst({ x: index, y: 0.9, z: 0 }, modifiers)).toBe(true);
    }
    const queuedStep = system.step({
      ...baseStep,
      ballInFlight: false,
      ballPosition: { x: 0, y: 0.9, z: 0 },
      targets: [{ id: 2, position: { x: 16, y: 0.9, z: 0 }, radius: 0.2 }],
    });
    expect(queuedStep.hits.filter((hit) => hit.source === 'chain-lightning')).toHaveLength(8);
    expect(queuedStep.events.filter((event) => event.type === 'frost-burst-triggered')).toHaveLength(8);

    expect(system.renderState).toBe(renderState);
    expect(renderState.garlicZones).toBe(poolReferences.garlicZones);
    expect(renderState.orbitingBalls).toBe(poolReferences.orbitingBalls);
    expect(renderState.ghostPasses).toBe(poolReferences.ghostPasses);
    expect(renderState.multiBallShots).toBe(poolReferences.multiBallShots);
    expect(renderState.blackHoleZones).toBe(poolReferences.blackHoleZones);
  });
});
