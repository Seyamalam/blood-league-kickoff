import type { MatchStage } from '../game/match';
import type { MatchPhase } from '../game/simulation/types';

export const QA_SNAPSHOT_HOOK = '__bloodLeagueQaSnapshot';

export type QaScenario = 'victory' | 'defeat' | 'upgrade' | 'evolution';
export type QaTerminalScenario = Extract<QaScenario, 'victory' | 'defeat'>;

export interface QaTerminalFixture {
  readonly gamePhase: Extract<MatchPhase, 'won' | 'dead'>;
  readonly matchStage: Extract<MatchStage, 'victory' | 'dead'>;
  readonly elapsed: number;
  readonly score: number;
  readonly kills: number;
  readonly goals: number;
}

export interface QaSnapshot {
  readonly scenario: QaScenario;
  readonly gamePhase: MatchPhase;
  readonly matchStage: MatchStage;
  readonly resultsVisible: boolean;
  readonly resultsOutcome: 'victory' | 'defeat' | null;
  readonly upgradeVisible: boolean;
  readonly evolutionVisible: boolean;
  readonly pointerLocked: boolean;
}

interface QaHookTarget {
  [QA_SNAPSHOT_HOOK]?: () => Readonly<QaSnapshot>;
}

/** QA routes are deliberately unavailable in preview and production builds. */
export function readQaScenario(search: string, development: boolean): QaScenario | null {
  if (!development) return null;
  const scenario = new URLSearchParams(search).get('qa');
  return scenario === 'victory' || scenario === 'defeat' || scenario === 'upgrade' || scenario === 'evolution'
    ? scenario
    : null;
}

/** Stable terminal data lets browser QA exercise the real results integration without waiting nine minutes. */
export function createQaTerminalFixture(scenario: QaTerminalScenario): QaTerminalFixture {
  if (scenario === 'victory') {
    return {
      gamePhase: 'won',
      matchStage: 'victory',
      elapsed: 543,
      score: 32_750,
      kills: 168,
      goals: 2,
    };
  }
  return {
    gamePhase: 'dead',
    matchStage: 'dead',
    elapsed: 214,
    score: 7_450,
    kills: 39,
    goals: 1,
  };
}

/** Installs a non-writable function that returns a fresh frozen integration snapshot. */
export function installQaSnapshotHook(target: object, readSnapshot: () => QaSnapshot): () => void {
  const hookTarget = target as QaHookTarget;
  Object.defineProperty(hookTarget, QA_SNAPSHOT_HOOK, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: () => Object.freeze({ ...readSnapshot() }),
  });
  return () => {
    delete hookTarget[QA_SNAPSHOT_HOOK];
  };
}
