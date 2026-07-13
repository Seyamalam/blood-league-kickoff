import { describe, expect, it } from 'vitest';
import { PROTOTYPE_MATCH_CONFIG, createMatchDirectorState, updateMatchDirector } from './index';

describe('match director', () => {
  it('advances the opening when its time and kill gates pass', () => {
    const state = { ...createMatchDirectorState(), matchElapsed: 7.99, stageElapsed: 7.99 };
    const update = updateMatchDirector(state, { dt: 0.02, totalKills: 4, playerDead: false });
    expect(update.state.stage).toBe('firstHalf');
    expect(update.events).toContainEqual({ type: 'stageChanged', from: 'opening', to: 'firstHalf' });
  });

  it('runs the complete second-half stage sequence', () => {
    const initial = createMatchDirectorState();
    const firstGoal = updateMatchDirector(
      { ...initial, stage: 'goalOpportunity', matchElapsed: 50, stageElapsed: 2 },
      { dt: 0.02, totalKills: 15, playerDead: false, goalScored: true },
    );
    expect(firstGoal.state.stage).toBe('escalation');
    expect(firstGoal.events).toContainEqual({ type: 'goalScored', goal: 'first' });

    const halftime = updateMatchDirector(
      { ...firstGoal.state, matchElapsed: PROTOTYPE_MATCH_CONFIG.escalation.deadlineMatchTime },
      { dt: 0, totalKills: 30, playerDead: false },
    );
    expect(halftime.state.stage).toBe('halftimeChoice');

    const choice = updateMatchDirector(
      halftime.state,
      { dt: 0.02, totalKills: 30, playerDead: false, halftimeChoice: 'pace' },
    );
    expect(choice.state.stage).toBe('bloodMoon');
    expect(choice.state.halftimeChoice).toBe('pace');
    expect(choice.events).toContainEqual({
      type: 'halftimeChoiceSelected', choice: 'pace', automatic: false,
    });

    const finalGoal = updateMatchDirector(
      { ...choice.state, matchElapsed: PROTOTYPE_MATCH_CONFIG.bloodMoon.deadlineMatchTime },
      { dt: 0, totalKills: 50, playerDead: false },
    );
    expect(finalGoal.state.stage).toBe('finalGoal');

    const finalWave = updateMatchDirector(
      finalGoal.state,
      { dt: 0.02, totalKills: 50, playerDead: false, goalScored: true },
    );
    expect(finalWave.state.stage).toBe('finalWave');
    expect(finalWave.state.goalsScored).toBe(2);
    expect(finalWave.events).toContainEqual({ type: 'goalScored', goal: 'final' });
  });

  it('opens the first goal at the end of the first half', () => {
    const state = {
      ...createMatchDirectorState(),
      stage: 'firstHalf' as const,
      matchElapsed: PROTOTYPE_MATCH_CONFIG.firstHalf.deadlineMatchTime,
      totalKills: 15,
    };
    const update = updateMatchDirector(state, { dt: 0, totalKills: 15, playerDead: false });
    expect(update.state.stage).toBe('goalOpportunity');
    expect(update.events).toContainEqual({
      type: 'goalOpportunityStarted', goal: 'first', duration: PROTOTYPE_MATCH_CONFIG.goalOpportunityDuration,
    });
  });

  it('selects the configured halftime fallback when the choice clock expires', () => {
    const state = {
      ...createMatchDirectorState(),
      stage: 'halftimeChoice' as const,
      stageElapsed: PROTOTYPE_MATCH_CONFIG.halftimeChoiceDuration,
    };
    const update = updateMatchDirector(state, { dt: 0, totalKills: 30, playerDead: false });
    expect(update.state.halftimeChoice).toBe('power');
    expect(update.events).toContainEqual({
      type: 'halftimeChoiceSelected', choice: 'power', automatic: true,
    });
  });

  it('turns boss defeat into victory during the final wave', () => {
    const state = { ...createMatchDirectorState(), stage: 'finalWave' as const, matchElapsed: 145, totalKills: 50 };
    const update = updateMatchDirector(state, {
      dt: 1 / 60,
      totalKills: 50,
      playerDead: false,
      bossDefeated: true,
    });
    expect(update.state.stage).toBe('victory');
    expect(update.events.some((event) => event.type === 'victory')).toBe(true);
  });

  it('makes death terminal', () => {
    const first = updateMatchDirector(createMatchDirectorState(), { dt: 1 / 60, totalKills: 0, playerDead: true });
    const second = updateMatchDirector(first.state, { dt: 1, totalKills: 10, playerDead: false });
    expect(second.state).toBe(first.state);
  });
});
