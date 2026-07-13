import { describe, expect, it } from 'vitest';
import {
  createQaTerminalFixture,
  installQaSnapshotHook,
  QA_SNAPSHOT_HOOK,
  readQaScenario,
  type QaSnapshot,
} from './QaScenario';

describe('development QA scenarios', () => {
  it('accepts only supported scenarios in development', () => {
    expect(readQaScenario('?qa=victory', true)).toBe('victory');
    expect(readQaScenario('?qa=defeat', true)).toBe('defeat');
    expect(readQaScenario('?qa=upgrade', true)).toBe('upgrade');
    expect(readQaScenario('?qa=evolution', true)).toBe('evolution');
    expect(readQaScenario('?qa=halftime', true)).toBeNull();
    expect(readQaScenario('?qa=victory', false)).toBeNull();
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
    pointerLocked: false,
  };
}
