import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_COMPLETION_CELEBRATION,
  TUTORIAL_RUN_TIME_LIMIT,
  createTutorialRunState,
  tutorialAssistsFor,
  updateTutorialRun,
} from './tutorialRun';

describe('guided tutorial run', () => {
  it('maps lesson completions to bounded assists', () => {
    expect(tutorialAssistsFor(['movement', 'dash', 'ultimate'])).toEqual([
      'prepare-ultimate',
      'spawn-progression-shards',
    ]);
  });

  it('ends after a short celebration once every lesson is complete', () => {
    let state = updateTutorialRun(createTutorialRunState(), 0.1, true);
    expect(state.outcome).toBe('active');
    for (let elapsed = 0; elapsed < TUTORIAL_COMPLETION_CELEBRATION + 0.2; elapsed += 0.1) {
      state = updateTutorialRun(state, 0.1, true);
    }
    expect(state.outcome).toBe('completed');
  });

  it('caps an unfinished training session at three minutes', () => {
    let state = createTutorialRunState();
    for (let elapsed = 0; elapsed < TUTORIAL_RUN_TIME_LIMIT + 1; elapsed += 0.1) {
      state = updateTutorialRun(state, 0.1, false);
    }
    expect(state.outcome).toBe('time-expired');
    expect(state.elapsed).toBe(TUTORIAL_RUN_TIME_LIMIT);
  });
});
