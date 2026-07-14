import { describe, expect, it } from 'vitest';
import { WeaponExpansionSystem, type WeaponExpansionModifiers } from './index';

const EMPTY: WeaponExpansionModifiers = {
  dashShockwaveDamage: 0,
  dashShockwaveRadius: 0,
  dashShockwaveKnockback: 0,
  holyZoneDamage: 0,
  holyZoneRadius: 0,
  holyZoneDuration: 0,
  ricochetDamage: 0,
  ricochetTargets: 0,
  ricochetRange: 0,
  bloodBarrierCharges: 0,
  bloodBarrierRechargeMultiplier: 1,
};

describe('WeaponExpansionSystem', () => {
  it('turns a queued dash into bounded radial damage and knockback intent', () => {
    const system = new WeaponExpansionSystem();
    const modifiers = {
      ...EMPTY,
      dashShockwaveDamage: 12,
      dashShockwaveRadius: 0.75,
      dashShockwaveKnockback: 5,
    };
    expect(system.triggerDashShockwave({ x: 0, y: 0.9, z: 0 }, modifiers)).toBe(true);
    const targets = Array.from({ length: 30 }, (_, index) => ({
      id: index + 1,
      position: { x: 1, y: 0.9, z: 0 },
      radius: 0.3,
    }));
    targets.push({ id: 99, position: { x: 8, y: 0.9, z: 0 }, radius: 0.3 });
    const result = system.step({
      dt: 1 / 60,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      modifiers,
      targets,
    });

    expect(result.hits.filter((hit) => hit.source === 'dash-shockwave')).toHaveLength(24);
    expect(result.hits[0]).toMatchObject({ targetId: 1, damage: 12 });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'dash-shockwave-knockback',
        targetId: 1,
        force: { x: 5, y: 0, z: 0 },
      }),
    );
    expect(
      system.step({ dt: 0, playerPosition: { x: 0, y: 0, z: 0 }, modifiers, targets }).hits,
    ).toHaveLength(0);
  });

  it('plants a fixed-pool holy zone with deterministic pulse timing', () => {
    const system = new WeaponExpansionSystem();
    const modifiers = {
      ...EMPTY,
      holyZoneDamage: 4,
      holyZoneRadius: 0.5,
      holyZoneDuration: 1.2,
    };
    expect(system.triggerHolyPenaltyZone({ x: 0, y: 0.9, z: 0 }, modifiers)).toBe(true);
    const input = {
      dt: 0,
      playerPosition: { x: 0, y: 0.9, z: 0 },
      modifiers,
      targets: [{ id: 7, position: { x: 1, y: 0.9, z: 0 }, radius: 0.2 }],
    };
    const first = system.step(input);
    expect(first.hits).toContainEqual(
      expect.objectContaining({ targetId: 7, damage: 4, source: 'holy-penalty-zone' }),
    );
    expect(first.events).toContainEqual(
      expect.objectContaining({ type: 'holy-zone-spawned', radius: 1.95, duration: 1.2 }),
    );
    expect(system.step({ ...input, dt: 0.1 }).hits).toHaveLength(0);
    system.step({ ...input, dt: 0.1 });
    system.step({ ...input, dt: 0.1 });
    system.step({ ...input, dt: 0.1 });
    expect(system.step({ ...input, dt: 0.1 }).hits).toContainEqual(
      expect.objectContaining({ targetId: 7, source: 'holy-penalty-zone' }),
    );

    for (let index = 0; index < 5; index += 1) {
      expect(system.triggerHolyPenaltyZone({ x: index, y: 0, z: 0 }, modifiers)).toBe(true);
    }
    const spawnStep = system.step({ ...input, targets: [] });
    expect(spawnStep.events.filter((event) => event.type === 'holy-zone-spawned')).toHaveLength(3);
  });

  it('banks into nearest unvisited targets with stable ID tie-breaking', () => {
    const system = new WeaponExpansionSystem();
    const modifiers = {
      ...EMPTY,
      ricochetDamage: 7,
      ricochetTargets: 3,
      ricochetRange: 0.2,
    };
    expect(system.triggerRicochet(1, { x: 0, y: 0.9, z: 0 }, modifiers)).toBe(true);
    const result = system.step({
      dt: 1 / 60,
      playerPosition: { x: 10, y: 0.9, z: 10 },
      modifiers,
      targets: [
        { id: 9, position: { x: 2, y: 0.9, z: 0 }, radius: 0.2 },
        { id: 2, position: { x: -2, y: 0.9, z: 0 }, radius: 0.2 },
        { id: 3, position: { x: -3, y: 0.9, z: 0 }, radius: 0.2 },
        { id: 50, position: { x: 20, y: 0.9, z: 0 }, radius: 0.2 },
      ],
    });

    expect(result.hits.map((hit) => hit.targetId)).toEqual([2, 3]);
    expect(result.hits.every((hit) => hit.damage === 7 && hit.source === 'ricochet-ball')).toBe(true);
    expect(result.events.filter((event) => event.type === 'ricochet-hit')).toEqual([
      expect.objectContaining({ fromTargetId: 1, targetId: 2, jumpIndex: 0 }),
      expect.objectContaining({ fromTargetId: 2, targetId: 3, jumpIndex: 1 }),
    ]);
  });

  it('absorbs complete hits with finite charges and recharges on fixed time', () => {
    const system = new WeaponExpansionSystem();
    const modifiers = {
      ...EMPTY,
      bloodBarrierCharges: 2,
      bloodBarrierRechargeMultiplier: 0.35,
    };
    const emptyStep = { playerPosition: { x: 0, y: 0, z: 0 }, modifiers, targets: [] };
    expect(system.step({ ...emptyStep, dt: 0 })).toMatchObject({
      barrierCharges: 2,
      barrierMaxCharges: 2,
    });
    expect(system.absorbWithBloodBarrier(25, modifiers)).toMatchObject({
      absorbedDamage: 25,
      remainingDamage: 0,
      charges: 1,
    });
    expect(system.absorbWithBloodBarrier(10, modifiers)).toMatchObject({
      absorbedDamage: 10,
      remainingDamage: 0,
      charges: 0,
    });
    expect(system.absorbWithBloodBarrier(8, modifiers)).toMatchObject({
      absorbedDamage: 0,
      remainingDamage: 8,
    });
    for (let index = 0; index < 63; index += 1) system.step({ ...emptyStep, dt: 0.1 });
    expect(system.step({ ...emptyStep, dt: 0.1 }).barrierCharges).toBe(1);
  });

  it('rejects all disabled triggers and preserves stable result arrays', () => {
    const system = new WeaponExpansionSystem();
    expect(system.triggerDashShockwave({ x: 0, y: 0, z: 0 }, EMPTY)).toBe(false);
    expect(system.triggerHolyPenaltyZone({ x: 0, y: 0, z: 0 }, EMPTY)).toBe(false);
    expect(system.triggerRicochet(1, { x: 0, y: 0, z: 0 }, EMPTY)).toBe(false);
    const input = { dt: 0, playerPosition: { x: 0, y: 0, z: 0 }, modifiers: EMPTY, targets: [] };
    const first = system.step(input);
    const second = system.step(input);
    expect(second.hits).toBe(first.hits);
    expect(second.events).toBe(first.events);
  });
});
