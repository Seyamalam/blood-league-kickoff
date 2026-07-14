import type { ProductionMatchPhaseId } from '../game/match/productionRun';

export type MatchOutcomeAudioState = 'active' | 'victory' | 'defeat';

/** Narrow port implemented by AudioManager and easy to replace in deterministic tests. */
export interface DynamicMatchAudioPort {
  setMatchIntensity(intensity: number | 'paused'): void;
  playKickoff(): void;
  playPhase(phase?: number): void;
  playHalftime(): void;
  playBloodMoon(): void;
  playFinalWave(): void;
  playMinibossEntrance(): void;
  playBossEntrance(): void;
  playBossPhase(phase: 'bloodRush' | 'desperation' | number): void;
  playGoalkeeperDefeat(): void;
  playCrowdRise(intensity?: number): void;
  playGoal(): void;
  playVictory(): void;
  playDefeat(): void;
}

export interface DynamicMatchAudioInput {
  readonly dt: number;
  readonly phaseId: ProductionMatchPhaseId;
  readonly combatPressure?: number;
  readonly playerHealthRatio?: number;
  readonly combo?: number;
  readonly possessionRatio?: number;
  readonly bossHealthRatio?: number | null;
  readonly paused?: boolean;
  readonly goalScored?: boolean;
  readonly goalkeeperDefeated?: boolean;
  readonly victory?: boolean;
  readonly defeat?: boolean;
}

export interface DynamicMatchAudioState {
  readonly phaseId: ProductionMatchPhaseId | null;
  readonly scoreIntensity: number;
  readonly crowdIntensity: number;
  readonly crowdTier: 0 | 1 | 2 | 3;
  /** 0 outside the boss, then 1/2/3 as its health thresholds fall. */
  readonly bossTier: 0 | 1 | 2 | 3;
  readonly outcome: MatchOutcomeAudioState;
}

const PHASE_INTENSITY: Readonly<Record<ProductionMatchPhaseId, number>> = Object.freeze({
  kickoff: 0.2,
  'first-half': 0.34,
  'rival-invasion': 0.55,
  'first-miniboss': 0.64,
  halftime: 0.12,
  'second-half': 0.58,
  'blood-moon': 0.78,
  'final-goalkeeper': 0.88,
  'final-boss': 0.94,
  'full-time': 0,
});

export function createDynamicMatchAudioState(): DynamicMatchAudioState {
  return Object.freeze({
    phaseId: null,
    scoreIntensity: 0,
    crowdIntensity: 0,
    crowdTier: 0,
    bossTier: 0,
    outcome: 'active',
  });
}

/**
 * Converts simulation state into an adaptive procedural score and sparse event
 * cues. No clocks or browser globals are read, so replays produce the same mix.
 */
export function updateDynamicMatchAudio(
  previous: DynamicMatchAudioState,
  input: DynamicMatchAudioInput,
  audio: DynamicMatchAudioPort,
): DynamicMatchAudioState {
  const dt = finiteClamped(input.dt, 0, 1);
  const phaseChanged = previous.phaseId !== input.phaseId;
  const outcome = resolveOutcome(previous.outcome, input);
  const pressure = clamp01(input.combatPressure ?? 0);
  const healthDanger = 1 - clamp01(input.playerHealthRatio ?? 1);
  const comboMomentum = clamp01((input.combo ?? 0) / 40);
  const possession = clamp01(input.possessionRatio ?? 0);

  let scoreTarget = clamp01(
    PHASE_INTENSITY[input.phaseId] + pressure * 0.14 + healthDanger * 0.08 + comboMomentum * 0.07,
  );
  if (outcome !== 'active') scoreTarget = 0;
  const scoreIntensity = smooth(
    previous.scoreIntensity,
    scoreTarget,
    scoreTarget > previous.scoreIntensity ? 5 : 2.4,
    dt,
  );

  let crowdTarget = clamp01(
    PHASE_INTENSITY[input.phaseId] * 0.38 + pressure * 0.2 + comboMomentum * 0.24 + possession * 0.18,
  );
  if (input.phaseId === 'halftime' || outcome !== 'active') crowdTarget *= 0.25;
  const crowdIntensity = smooth(
    previous.crowdIntensity,
    crowdTarget,
    crowdTarget > previous.crowdIntensity ? 3.5 : 1.4,
    dt,
  );
  const crowdTier = crowdTierFor(crowdIntensity);
  const bossTier = bossTierFor(input.phaseId, input.bossHealthRatio);

  audio.setMatchIntensity(input.paused ? 'paused' : scoreIntensity);
  if (phaseChanged && outcome === 'active') playPhaseCue(input.phaseId, audio);
  if (crowdTier > previous.crowdTier && crowdTier >= 2) audio.playCrowdRise(crowdIntensity);
  if (input.goalScored) {
    audio.playGoal();
    audio.playCrowdRise(1);
  }
  if (input.goalkeeperDefeated) audio.playGoalkeeperDefeat();
  if (bossTier > previous.bossTier && bossTier >= 2) {
    audio.playBossPhase(bossTier === 2 ? 'bloodRush' : 'desperation');
  }
  if (outcome !== previous.outcome) {
    if (outcome === 'victory') {
      audio.playVictory();
      audio.playCrowdRise(1);
    } else if (outcome === 'defeat') {
      audio.playDefeat();
    }
  }

  return Object.freeze({
    phaseId: input.phaseId,
    scoreIntensity,
    crowdIntensity,
    crowdTier,
    bossTier,
    outcome,
  });
}

function playPhaseCue(phaseId: ProductionMatchPhaseId, audio: DynamicMatchAudioPort): void {
  switch (phaseId) {
    case 'kickoff':
      audio.playKickoff();
      break;
    case 'first-half':
      audio.playPhase(1);
      break;
    case 'rival-invasion':
      audio.playPhase(2);
      audio.playCrowdRise(0.7);
      break;
    case 'first-miniboss':
      audio.playMinibossEntrance();
      break;
    case 'halftime':
      audio.playHalftime();
      break;
    case 'second-half':
      audio.playKickoff();
      audio.playPhase(3);
      break;
    case 'blood-moon':
      audio.playBloodMoon();
      break;
    case 'final-goalkeeper':
      audio.playFinalWave();
      break;
    case 'final-boss':
      audio.playBossEntrance();
      break;
    case 'full-time':
      break;
  }
}

function resolveOutcome(
  previous: MatchOutcomeAudioState,
  input: Pick<DynamicMatchAudioInput, 'victory' | 'defeat'>,
): MatchOutcomeAudioState {
  if (previous !== 'active') return previous;
  if (input.victory) return 'victory';
  if (input.defeat) return 'defeat';
  return 'active';
}

function bossTierFor(phaseId: ProductionMatchPhaseId, health: number | null | undefined): 0 | 1 | 2 | 3 {
  if (phaseId !== 'final-boss' || health === null || health === undefined) return 0;
  const ratio = clamp01(health);
  if (ratio <= 0.33) return 3;
  if (ratio <= 0.66) return 2;
  return 1;
}

function crowdTierFor(value: number): 0 | 1 | 2 | 3 {
  if (value >= 0.75) return 3;
  if (value >= 0.5) return 2;
  if (value >= 0.2) return 1;
  return 0;
}

function smooth(current: number, target: number, speed: number, dt: number): number {
  if (dt === 0) return current;
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

function finiteClamped(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : minimum;
}

function clamp01(value: number): number {
  return finiteClamped(value, 0, 1);
}
