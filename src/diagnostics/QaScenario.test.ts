import { describe, expect, it } from 'vitest';
import {
  createQaEvolutionFixture,
  createQaTerminalFixture,
  installQaSnapshotHook,
  QA_SNAPSHOT_HOOK,
  readQaScenario,
  readQaEvolutionId,
  type QaSnapshot,
} from './QaScenario';
import { EVOLUTION_DEFINITIONS, EVOLUTION_IDS, chooseUpgrade } from '../game/progression';

describe('development QA scenarios', () => {
  it('accepts only supported scenarios in development', () => {
    expect(readQaScenario('?qa=victory', true)).toBe('victory');
    expect(readQaScenario('?qa=defeat', true)).toBe('defeat');
    expect(readQaScenario('?qa=upgrade', true)).toBe('upgrade');
    expect(readQaScenario('?qa=evolution', true)).toBe('evolution');
    expect(readQaScenario('?qa=goal', true)).toBe('goal');
    expect(readQaScenario('?qa=boss', true)).toBe('boss');
    expect(readQaScenario('?qa=halftime', true)).toBeNull();
    expect(readQaScenario('?qa=victory', false)).toBeNull();
    expect(readQaScenario('?qa=goal', false)).toBeNull();
    expect(readQaScenario('?qa=boss', false)).toBeNull();
  });

  it('validates evolution fixture IDs only in development', () => {
    expect(readQaEvolutionId('?qa=evolution', true)).toBe('moonBreaker');
    expect(readQaEvolutionId('?qa=evolution&evolution=stormHalo', true)).toBe('stormHalo');
    expect(readQaEvolutionId('?qa=evolution&evolution=unknown', true)).toBeNull();
    expect(readQaEvolutionId('?qa=evolution&evolution=stormHalo', false)).toBeNull();
  });

  it.each(EVOLUTION_IDS)('creates one-choice deterministic QA fixture for %s', (evolutionId) => {
    const fixture = createQaEvolutionFixture(evolutionId);
    expect(fixture.evolutionId).toBe(evolutionId);
    expect(fixture.state.pendingLevelUps).toBe(1);
    expect(fixture.state.evolutions[evolutionId]).toBe(false);

    const result = chooseUpgrade(fixture.state, fixture.finalUpgradeId);
    expect(result.applied).toBe(true);
    if (!result.applied) return;
    expect(result.evolutionEvents.map((event) => event.evolutionId)).toEqual([evolutionId]);
    expect(result.state.evolutions[evolutionId]).toBe(true);
    expect(result.evolutionEvents[0]?.definition).toBe(EVOLUTION_DEFINITIONS[evolutionId]);
  });

  it('creates deterministic terminal fixtures for both outcomes', () => {
    expect(createQaTerminalFixture('victory')).toEqual({
      gamePhase: 'won',
      matchStage: 'victory',
      elapsed: 543,
      score: 32_750,
      kills: 168,
      goals: 2,
    });
    expect(createQaTerminalFixture('defeat')).toEqual({
      gamePhase: 'dead',
      matchStage: 'dead',
      elapsed: 214,
      score: 7_450,
      kills: 39,
      goals: 1,
    });
  });

  it('exposes fresh frozen snapshots through a removable non-writable hook', () => {
    const target = {} as Record<string, unknown>;
    let resultsVisible = false;
    const uninstall = installQaSnapshotHook(target, () => snapshot(resultsVisible));
    const descriptor = Object.getOwnPropertyDescriptor(target, QA_SNAPSHOT_HOOK);
    const read = target[QA_SNAPSHOT_HOOK] as () => QaSnapshot;
    const first = read();
    resultsVisible = true;
    const second = read();

    expect(descriptor?.writable).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.resultsVisible).toBe(false);
    expect(second.resultsVisible).toBe(true);
    expect(second).not.toBe(first);
    uninstall();
    expect(target[QA_SNAPSHOT_HOOK]).toBeUndefined();
  });
});

function snapshot(resultsVisible: boolean): QaSnapshot {
  return {
    scenario: 'victory',
    gamePhase: 'won',
    matchStage: 'victory',
    resultsVisible,
    resultsOutcome: resultsVisible ? 'victory' : null,
    upgradeVisible: false,
    evolutionVisible: false,
    requestedEvolutionId: null,
    unlockedEvolutionIds: [],
    evolutionToastId: null,
    evolutionToastName: null,
    pointerLocked: false,
  };
}
