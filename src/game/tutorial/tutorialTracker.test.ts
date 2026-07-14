import { describe, expect, it } from 'vitest';
import { TutorialTracker, createTutorialState, getActiveTutorialPrompt, reduceTutorialState } from './index';

describe('tutorial tracker', () => {
  it('advances past each demonstrated action', () => {
    const tracker = new TutorialTracker();
    expect(tracker.activePrompt?.id).toBe('movement');
    tracker.signal('movement-demonstrated');
    expect(tracker.activePrompt?.id).toBe('kick');
    tracker.signal('kick-demonstrated');
    tracker.signal('recall-demonstrated');
    tracker.signal('dash-demonstrated');
    expect(tracker.activePrompt?.id).toBe('ultimate');
    tracker.signal('ultimate-demonstrated');
    expect(tracker.activePrompt?.id).toBe('progression');
  });

  it('teaches the character ultimate after movement fundamentals', () => {
    let state = createTutorialState();
    for (const signal of [
      'movement-demonstrated',
      'kick-demonstrated',
      'recall-demonstrated',
      'dash-demonstrated',
    ] as const) {
      state = reduceTutorialState(state, signal).state;
    }
    expect(getActiveTutorialPrompt(state)?.id).toBe('ultimate');
    expect(reduceTutorialState(state, 'ultimate-demonstrated').completedNow).toEqual(['ultimate']);
  });

  it('requires both collecting XP and selecting an upgrade for progression', () => {
    let state = createTutorialState();
    state = reduceTutorialState(state, 'xp-collected').state;
    expect(state.completed.progression).toBe(false);
    const update = reduceTutorialState(state, 'upgrade-selected');
    expect(update.state.completed.progression).toBe(true);
    expect(update.completedNow).toEqual(['progression']);
  });

  it('records out-of-order actions and skips their later prompts', () => {
    let state = createTutorialState();
    state = reduceTutorialState(state, 'goal-scored').state;
    state = reduceTutorialState(state, 'dash-demonstrated').state;
    state = reduceTutorialState(state, 'movement-demonstrated').state;
    state = reduceTutorialState(state, 'kick-demonstrated').state;
    state = reduceTutorialState(state, 'recall-demonstrated').state;
    state = reduceTutorialState(state, 'ultimate-demonstrated').state;
    state = reduceTutorialState(state, 'upgrade-selected').state;
    state = reduceTutorialState(state, 'xp-collected').state;
    expect(getActiveTutorialPrompt(state)).toBeNull();
  });

  it('supports returning-player completion and reset', () => {
    const tracker = new TutorialTracker(true);
    expect(tracker.complete).toBe(true);
    expect(tracker.activePrompt).toBeNull();
    tracker.reset();
    expect(tracker.complete).toBe(false);
    tracker.skip();
    expect(tracker.complete).toBe(true);
  });
});
