import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, type CharacterId } from '../characters';
import { CharacterUltimateSystem } from './CharacterUltimateSystem';
import { CHARACTER_ULTIMATE_DEFINITIONS } from './characterUltimateDefinitions';
import type { CharacterUltimateStepInput, UltimateTarget } from './characterUltimateTypes';

const ORIGIN = { x: 0, y: 0.9, z: 0 };
const FORWARD = { x: 0, y: 0, z: -1 };

describe('CharacterUltimateSystem', () => {
  it('defines a frozen, unique ultimate for all six characters', () => {
    const ids = CHARACTER_IDS.map((characterId) => {
      const definition = CHARACTER_ULTIMATE_DEFINITIONS[characterId];
      expect(definition.characterId).toBe(characterId);
      expect(definition.chargeRequired).toBe(100);
      expect(definition.duration).toBeGreaterThan(0);
      expect(definition.iconId).toMatch(/^ultimate-/);
      expect(Object.isFrozen(definition)).toBe(true);
      return definition.id;
    });

    expect(new Set(ids).size).toBe(CHARACTER_IDS.length);
    expect(Object.isFrozen(CHARACTER_ULTIMATE_DEFINITIONS)).toBe(true);
  });

  it('clamps charge and only activates when fully charged', () => {
    const system = new CharacterUltimateSystem('maestro');
    expect(system.gainCharge(Number.NaN)).toBe(0);
    expect(system.gainCharge(-40)).toBe(0);
    expect(system.gainCharge(70)).toBe(70);
    expect(system.step(input({ activate: true })).activated).toBe(false);
    expect(system.gainCharge(500)).toBe(100);

    const result = system.step(input({ activate: true }));
    expect(result.activated).toBe(true);
    expect(result.state.charge).toBe(0);
    expect(result.state.ready).toBe(false);
    expect(result.state.activationCount).toBe(1);
    expect(result.events[0]).toMatchObject({ type: 'ultimate-activated', ultimateId: 'midnightOrchestra' });
  });

  it('Maestro threads at most six deterministic nearest-target passes', () => {
    const system = readySystem('maestro');
    const targets = Array.from({ length: 8 }, (_, index) => target(20 - index, index + 1, 0));

    const result = system.step(input({ activate: true, targets }));
    expect(result.hits).toHaveLength(6);
    expect(result.hits.map((hit) => hit.targetId)).toEqual([20, 19, 18, 17, 16, 15]);
    expect(result.hits.every((hit) => hit.damage === 22 && hit.source === 'midnightOrchestra')).toBe(true);
    expect(result.events.filter((event) => event.type === 'spectral-assist')).toHaveLength(6);
    expect(result.effects.recallSpeedMultiplier).toBe(1.85);
    expect(result.effects.volleyWindowBonus).toBe(0.35);
  });

  it('Breakaway gains redline movement and emits bounded close-range pulses', () => {
    const system = readySystem('breakaway');
    const result = system.step(input({ activate: true, targets: [target(1, 1, 0), target(2, 5, 0)] }));

    expect(result.effects.movementSpeedMultiplier).toBe(1.5);
    expect(result.effects.dashCooldownMultiplier).toBe(0.4);
    expect(result.hits.map((hit) => hit.targetId)).toEqual([1]);
    expect(result.events.some((event) => event.type === 'redline-pulse')).toBe(true);

    const quietStep = system.step(input({ targets: [target(1, 1, 0)] }));
    expect(quietStep.hits).toHaveLength(0);
    expect(quietStep.events).toHaveLength(0);
  });

  it('Tower damages and knocks back only targets inside its forward cone', () => {
    const system = readySystem('tower');
    const result = system.step(
      input({
        activate: true,
        targets: [target(1, 0, -5), target(2, 5, 0), target(3, 0, 4), target(4, 0.5, -8)],
      }),
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual([1, 4]);
    expect(result.hits.every((hit) => hit.damage === 72)).toBe(true);
    expect(result.events.filter((event) => event.type === 'ultimate-knockback')).toHaveLength(2);
    expect(result.effects.damageTakenMultiplier).toBe(0.5);
    expect(result.effects.knockbackMultiplier).toBe(1.75);
  });

  it('Finisher targets the highest threat before distance and has threat-scaled damage', () => {
    const system = readySystem('finisher');
    const result = system.step(
      input({
        activate: true,
        targets: [target(1, 1, 0), target(2, 2, 0, 'elite'), target(3, 20, 0, 'boss')],
      }),
    );

    expect(result.hits).toEqual([expect.objectContaining({ targetId: 3, damage: 180, source: 'lastTouch' })]);
    expect(result.events.some((event) => event.type === 'last-touch-strike' && event.targetId === 3)).toBe(
      true,
    );
    expect(result.effects.ballDamageMultiplier).toBe(1.35);
    expect(result.effects.eliteDamageMultiplier).toBe(2);
  });

  it('Engine vacuums pickups and pulses across the midfield', () => {
    const system = readySystem('engine');
    const result = system.step(input({ activate: true, targets: [target(1, 5.5, 0), target(2, 7, 0)] }));

    expect(result.hits.map((hit) => hit.targetId)).toEqual([1]);
    expect(result.hits[0]?.damage).toBe(14);
    expect(result.effects.pickupRadiusMultiplier).toBe(3);
    expect(result.effects.movementSpeedMultiplier).toBe(1.25);
    expect(result.events.some((event) => event.type === 'full-pitch-pulse')).toBe(true);
  });

  it('Guardian provides an activation heal, regeneration, and major damage reduction', () => {
    const system = readySystem('guardian');
    const result = system.step(input({ activate: true, dt: 0.1 }));

    expect(result.healing).toBeCloseTo(24.25);
    expect(result.effects.damageTakenMultiplier).toBe(0.22);
    expect(result.events.some((event) => event.type === 'clean-sheet-aegis')).toBe(true);

    const next = system.step(input({ dt: 0.1 }));
    expect(next.healing).toBeCloseTo(0.25);
    expect(next.effects.damageTakenMultiplier).toBe(0.22);
  });

  it('returns baseline effects after the active window expires', () => {
    const system = readySystem('tower');
    system.step(input({ activate: true, dt: 0.1 }));
    for (let index = 0; index < 30; index += 1) system.step(input({ dt: 0.1 }));

    const result = system.step(input({ dt: 0.1 }));
    expect(result.state.activeRemaining).toBe(0);
    expect(result.effects.damageTakenMultiplier).toBe(1);
    expect(result.effects.knockbackMultiplier).toBe(1);
  });

  it('reset clears activity and can provide deterministic starting charge', () => {
    const system = readySystem('engine');
    system.step(input({ activate: true }));
    system.reset(35);

    expect(system.state).toMatchObject({ charge: 35, ready: false, activeRemaining: 0, activationCount: 0 });
  });
});

function readySystem(characterId: CharacterId): CharacterUltimateSystem {
  const system = new CharacterUltimateSystem(characterId);
  system.gainCharge(100);
  return system;
}

function input(overrides: Partial<CharacterUltimateStepInput> = {}): CharacterUltimateStepInput {
  return {
    dt: 0.016,
    playerPosition: ORIGIN,
    facingDirection: FORWARD,
    targets: [],
    ...overrides,
  };
}

function target(
  id: number,
  x: number,
  z: number,
  threat: UltimateTarget['threat'] = 'normal',
): UltimateTarget {
  return { id, position: { x, y: 0.9, z }, radius: 0.45, threat };
}
