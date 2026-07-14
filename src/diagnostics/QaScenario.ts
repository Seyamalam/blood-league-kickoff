import type { MatchStage } from '../game/match';
import {
  EVOLUTION_DEFINITIONS,
  UPGRADE_DEFINITIONS,
  calculateModifiers,
  createProgressionState,
  getEligibleEvolutionIds,
  totalXpRequiredForLevel,
  type EvolutionId,
  type ProgressionState,
  type UpgradeId,
} from '../game/progression';
import type { MatchPhase } from '../game/simulation/types';

export const QA_SNAPSHOT_HOOK = '__bloodLeagueQaSnapshot';

export type QaScenario = 'victory' | 'defeat' | 'upgrade' | 'evolution' | 'goal';
export type QaTerminalScenario = Extract<QaScenario, 'victory' | 'defeat'>;

export interface QaTerminalFixture {
  readonly gamePhase: Extract<MatchPhase, 'won' | 'dead'>;
  readonly matchStage: Extract<MatchStage, 'victory' | 'dead'>;
  readonly elapsed: number;
  readonly score: number;
  readonly kills: number;
  readonly goals: number;
}

export interface QaEvolutionFixture {
  readonly evolutionId: EvolutionId;
  readonly finalUpgradeId: UpgradeId;
  readonly state: ProgressionState;
}

export interface QaSnapshot {
  readonly scenario: QaScenario;
  readonly gamePhase: MatchPhase;
  readonly matchStage: MatchStage;
  readonly resultsVisible: boolean;
  readonly resultsOutcome: 'victory' | 'defeat' | null;
  readonly upgradeVisible: boolean;
  readonly evolutionVisible: boolean;
  readonly requestedEvolutionId: EvolutionId | null;
  readonly unlockedEvolutionIds: readonly EvolutionId[];
  readonly evolutionToastId: EvolutionId | null;
  readonly evolutionToastName: string | null;
  readonly pointerLocked: boolean;
}

interface QaHookTarget {
  [QA_SNAPSHOT_HOOK]?: () => Readonly<QaSnapshot>;
}

/** QA routes are deliberately unavailable in preview and production builds. */
export function readQaScenario(search: string, development: boolean): QaScenario | null {
  if (!development) return null;
  const scenario = new URLSearchParams(search).get('qa');
  return scenario === 'victory' ||
    scenario === 'defeat' ||
    scenario === 'upgrade' ||
    scenario === 'evolution' ||
    scenario === 'goal'
    ? scenario
    : null;
}

/** Reads a validated evolution fixture ID; the bare route preserves the original Moon Breaker smoke test. */
export function readQaEvolutionId(search: string, development: boolean): EvolutionId | null {
  if (!development) return null;
  const params = new URLSearchParams(search);
  if (params.get('qa') !== 'evolution') return null;
  const requested = params.get('evolution') ?? 'moonBreaker';
  return Object.prototype.hasOwnProperty.call(EVOLUTION_DEFINITIONS, requested)
    ? (requested as EvolutionId)
    : null;
}

/** Creates an all-but-final prerequisite state so one real choice unlocks the requested evolution. */
export function createQaEvolutionFixture(evolutionId: EvolutionId): QaEvolutionFixture {
  const definition = EVOLUTION_DEFINITIONS[evolutionId];
  const finalRequirement = [...definition.requirements].sort(
    (left, right) =>
      UPGRADE_DEFINITIONS[right.upgradeId].prerequisites.length -
      UPGRADE_DEFINITIONS[left.upgradeId].prerequisites.length,
  )[0]!;
  const state = createProgressionState();
  state.level = 12;
  state.totalBloodXp = totalXpRequiredForLevel(state.level);
  state.pendingLevelUps = 1;

  const preload = (upgradeId: UpgradeId, stacks: number): void => {
    for (const prerequisite of UPGRADE_DEFINITIONS[upgradeId].prerequisites) {
      preload(prerequisite.upgradeId, prerequisite.minStacks);
    }
    state.upgradeStacks[upgradeId] = Math.max(state.upgradeStacks[upgradeId], stacks);
  };
  for (const requirement of definition.requirements) {
    if (requirement.upgradeId === finalRequirement.upgradeId) {
      for (const prerequisite of UPGRADE_DEFINITIONS[requirement.upgradeId].prerequisites) {
        preload(prerequisite.upgradeId, prerequisite.minStacks);
      }
      state.upgradeStacks[requirement.upgradeId] = requirement.minStacks - 1;
    } else {
      preload(requirement.upgradeId, requirement.minStacks);
    }
  }
  for (const incidentalEvolutionId of getEligibleEvolutionIds(state)) {
    if (incidentalEvolutionId !== evolutionId) state.evolutions[incidentalEvolutionId] = true;
  }
  state.modifiers = calculateModifiers(state.upgradeStacks, state.evolutions);
  return { evolutionId, finalUpgradeId: finalRequirement.upgradeId, state };
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
