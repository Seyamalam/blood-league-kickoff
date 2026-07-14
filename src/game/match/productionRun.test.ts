import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_MATCH_DURATION_SECONDS,
  PRODUCTION_MATCH_PHASES,
  getProductionMatchSnapshot,
  getProductionPhaseTransitions,
  validateProductionMatchPlan,
} from './productionRun';

describe('production match plan', () => {
  it('forms a gap-free deterministic 24-minute match', () => {
    expect(PRODUCTION_MATCH_DURATION_SECONDS).toBe(1_440);
    expect(validateProductionMatchPlan()).toBe(true);
    expect(PRODUCTION_MATCH_DURATION_SECONDS).toBeGreaterThanOrEqual(20 * 60);
    expect(PRODUCTION_MATCH_DURATION_SECONDS).toBeLessThanOrEqual(30 * 60);
    expect(PRODUCTION_MATCH_PHASES.map((phase) => phase.encounter)).toEqual([
      'tutorial-wave',
      'escalating-waves',
      'rival-invasion',
      'miniboss',
      'halftime-choice',
      'elite-waves',
      'blood-moon',
      'goalkeeper',
      'boss',
      'terminal',
    ]);
  });

  it('resolves boundary timestamps and authored waves consistently', () => {
    expect(getProductionMatchSnapshot(0).phase.id).toBe('kickoff');
    expect(getProductionMatchSnapshot(60).phase.id).toBe('first-half');
    expect(getProductionMatchSnapshot(599.99).phase.id).toBe('first-miniboss');
    expect(getProductionMatchSnapshot(600).phase.id).toBe('halftime');
    expect(getProductionMatchSnapshot(1_440).phase.id).toBe('full-time');
    expect(getProductionMatchSnapshot(Number.NaN).phase.id).toBe('kickoff');

    const secondHalf = getProductionMatchSnapshot(840);
    expect(secondHalf.phase.id).toBe('second-half');
    expect(secondHalf.phaseProgress).toBe(0.5);
    expect(secondHalf.waveIndex).toBe(6);
    expect(secondHalf.remaining).toBe(600);
  });

  it('reports every crossed phase once, even for a large fixed-step catch-up', () => {
    expect(getProductionPhaseTransitions(350, 670).map((phase) => phase.id)).toEqual([
      'rival-invasion',
      'first-miniboss',
      'halftime',
      'second-half',
    ]);
    expect(getProductionPhaseTransitions(670, 350)).toEqual([]);
  });

  it('rejects malformed custom plans', () => {
    expect(
      validateProductionMatchPlan([
        { ...PRODUCTION_MATCH_PHASES[0]!, endTime: 70 },
        ...PRODUCTION_MATCH_PHASES.slice(1),
      ]),
    ).toBe(false);
  });
});
