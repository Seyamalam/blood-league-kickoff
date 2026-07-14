export const PRODUCTION_MATCH_DURATION_SECONDS = 24 * 60;

export type ProductionMatchPhaseId =
  | 'kickoff'
  | 'first-half'
  | 'rival-invasion'
  | 'first-miniboss'
  | 'halftime'
  | 'second-half'
  | 'blood-moon'
  | 'final-goalkeeper'
  | 'final-boss'
  | 'full-time';

export type ProductionEncounterKind =
  | 'tutorial-wave'
  | 'escalating-waves'
  | 'rival-invasion'
  | 'miniboss'
  | 'halftime-choice'
  | 'elite-waves'
  | 'blood-moon'
  | 'goalkeeper'
  | 'boss'
  | 'terminal';

export interface ProductionMatchPhase {
  readonly id: ProductionMatchPhaseId;
  readonly title: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly encounter: ProductionEncounterKind;
  /** Spawn-pressure multiplier consumed by the spawn director. */
  readonly pressure: number;
  /** Number of authored wave beats in this phase. */
  readonly waveCount: number;
  readonly objective: string;
}

export interface ProductionMatchSnapshot {
  readonly phase: ProductionMatchPhase;
  readonly elapsed: number;
  readonly remaining: number;
  readonly matchProgress: number;
  readonly phaseProgress: number;
  /** Zero-based authored wave index, or null for non-wave phases. */
  readonly waveIndex: number | null;
}

/**
 * The shipping match spine. Its fixed timestamps make a seed replayable and
 * keep the complete run inside the requested 20–30 minute window.
 */
export const PRODUCTION_MATCH_PHASES: readonly ProductionMatchPhase[] = Object.freeze([
  phase('kickoff', 'Kickoff', 0, 60, 'tutorial-wave', 0.72, 2, 'Take the first touch and break the rush.'),
  phase(
    'first-half',
    'First Half',
    60,
    360,
    'escalating-waves',
    1,
    10,
    'Build your attack through escalating formations.',
  ),
  phase(
    'rival-invasion',
    'Rival Invasion',
    360,
    480,
    'rival-invasion',
    1.18,
    4,
    'Repel the rival captain and their pressing line.',
  ),
  phase(
    'first-miniboss',
    'First-Half Miniboss',
    480,
    600,
    'miniboss',
    1.25,
    3,
    'Break the enforcer before the halftime whistle.',
  ),
  phase(
    'halftime',
    'Halftime',
    600,
    660,
    'halftime-choice',
    0,
    0,
    'Choose the blessing that defines your second half.',
  ),
  phase(
    'second-half',
    'Second Half',
    660,
    1020,
    'elite-waves',
    1.38,
    12,
    'Survive elite formations and control possession.',
  ),
  phase(
    'blood-moon',
    'Blood Moon',
    1020,
    1140,
    'blood-moon',
    1.62,
    4,
    'Endure the transformed rival assault.',
  ),
  phase(
    'final-goalkeeper',
    'The Sealed Goal',
    1140,
    1320,
    'goalkeeper',
    1.48,
    3,
    'Shatter the goalkeeper guard and score the deciding goal.',
  ),
  phase(
    'final-boss',
    'Final Whistle',
    1320,
    PRODUCTION_MATCH_DURATION_SECONDS,
    'boss',
    1.8,
    3,
    'Defeat the Blood League champion before full time.',
  ),
  phase(
    'full-time',
    'Full Time',
    PRODUCTION_MATCH_DURATION_SECONDS,
    Number.POSITIVE_INFINITY,
    'terminal',
    0,
    0,
    'The match clock has expired.',
  ),
]);

export function getProductionMatchSnapshot(matchElapsed: number): ProductionMatchSnapshot {
  const elapsed = Number.isFinite(matchElapsed) ? Math.max(0, matchElapsed) : 0;
  const phase =
    PRODUCTION_MATCH_PHASES.find(
      (candidate) => elapsed >= candidate.startTime && elapsed < candidate.endTime,
    ) ?? PRODUCTION_MATCH_PHASES[PRODUCTION_MATCH_PHASES.length - 1]!;
  const finiteEnd = Number.isFinite(phase.endTime) ? phase.endTime : PRODUCTION_MATCH_DURATION_SECONDS;
  const duration = Math.max(0, finiteEnd - phase.startTime);
  const phaseElapsed = Math.max(0, elapsed - phase.startTime);
  const phaseProgress = duration === 0 ? 1 : clamp01(phaseElapsed / duration);
  return Object.freeze({
    phase,
    elapsed,
    remaining: Math.max(0, PRODUCTION_MATCH_DURATION_SECONDS - elapsed),
    matchProgress: clamp01(elapsed / PRODUCTION_MATCH_DURATION_SECONDS),
    phaseProgress,
    waveIndex:
      phase.waveCount > 0 ? Math.min(phase.waveCount - 1, Math.floor(phaseProgress * phase.waveCount)) : null,
  });
}

/** Returns every phase entered while advancing a fixed-step clock. */
export function getProductionPhaseTransitions(
  previousElapsed: number,
  nextElapsed: number,
): readonly ProductionMatchPhase[] {
  const from = finiteNonNegative(previousElapsed);
  const to = Math.max(from, finiteNonNegative(nextElapsed));
  return PRODUCTION_MATCH_PHASES.filter(
    (candidate) => candidate.startTime > from && candidate.startTime <= to,
  );
}

export function validateProductionMatchPlan(phases = PRODUCTION_MATCH_PHASES): boolean {
  if (phases.length === 0 || phases[0]?.startTime !== 0) return false;
  for (let index = 0; index < phases.length; index += 1) {
    const current = phases[index]!;
    if (current.endTime <= current.startTime || current.waveCount < 0 || current.pressure < 0) return false;
    if (index > 0 && phases[index - 1]!.endTime !== current.startTime) return false;
  }
  return phases[phases.length - 1]?.id === 'full-time';
}

function phase(
  id: ProductionMatchPhaseId,
  title: string,
  startTime: number,
  endTime: number,
  encounter: ProductionEncounterKind,
  pressure: number,
  waveCount: number,
  objective: string,
): ProductionMatchPhase {
  return Object.freeze({ id, title, startTime, endTime, encounter, pressure, waveCount, objective });
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
