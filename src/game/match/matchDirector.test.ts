import { describe, expect, it } from 'vitest';
import {
  FULL_MATCH_CONFIG,
  PROTOTYPE_MATCH_CONFIG,
  createMatchDirectorState,
  updateMatchDirector,
  type MatchDirectorState,
  type MatchStage,
} from './index';

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

    const choice = updateMatchDirector(halftime.state, {
      dt: 0.02,
      totalKills: 30,
      playerDead: false,
      halftimeChoice: 'pace',
    });
    expect(choice.state.stage).toBe('bloodMoon');
    expect(choice.state.halftimeChoice).toBe('pace');
    expect(choice.events).toContainEqual({
      type: 'halftimeChoiceSelected',
      choice: 'pace',
      automatic: false,
    });

    const finalGoal = updateMatchDirector(
      { ...choice.state, matchElapsed: PROTOTYPE_MATCH_CONFIG.bloodMoon.deadlineMatchTime },
      { dt: 0, totalKills: 50, playerDead: false },
    );
    expect(finalGoal.state.stage).toBe('finalGoal');

    const finalWave = updateMatchDirector(finalGoal.state, {
      dt: 0.02,
      totalKills: 50,
      playerDead: false,
      goalScored: true,
    });
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
      type: 'goalOpportunityStarted',
      goal: 'first',
      duration: PROTOTYPE_MATCH_CONFIG.goalOpportunityDuration,
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
      type: 'halftimeChoiceSelected',
      choice: 'power',
      automatic: true,
    });
  });

  it('turns boss defeat into victory during the final wave', () => {
    const state = {
      ...createMatchDirectorState(),
      stage: 'finalWave' as const,
      matchElapsed: 145,
      totalKills: 50,
    };
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
    const first = updateMatchDirector(createMatchDirectorState(), {
      dt: 1 / 60,
      totalKills: 0,
      playerDead: true,
    });
    const second = updateMatchDirector(first.state, { dt: 1, totalKills: 10, playerDead: false });
    expect(second.state).toBe(first.state);
  });

  it('deterministically drives the full nine-minute config through both goals and boss victory', () => {
    let state: MatchDirectorState = createMatchDirectorState();
    const transitions: MatchStage[] = [];
    const advance = (
      dt: number,
      totalKills: number,
      signals: {
        goalScored?: boolean;
        halftimeChoice?: 'power' | 'pace' | 'control';
        bossDefeated?: boolean;
      } = {},
    ): void => {
      const update = updateMatchDirector(
        state,
        { dt, totalKills, playerDead: false, ...signals },
        FULL_MATCH_CONFIG,
      );
      state = update.state;
      for (const event of update.events) if (event.type === 'stageChanged') transitions.push(event.to);
    };

    advance(FULL_MATCH_CONFIG.opening.deadlineMatchTime, 0);
    advance(FULL_MATCH_CONFIG.firstHalf.deadlineMatchTime - state.matchElapsed, 0);
    advance(0, 0, { goalScored: true });
    advance(FULL_MATCH_CONFIG.escalation.deadlineMatchTime - state.matchElapsed, 0);
    advance(0, 0, { halftimeChoice: 'control' });
    advance(FULL_MATCH_CONFIG.bloodMoon.deadlineMatchTime - state.matchElapsed, 0);
    advance(0, 0, { goalScored: true });
    advance(0, 0, { bossDefeated: true });

    expect(transitions).toEqual([
      'firstHalf',
      'goalOpportunity',
      'escalation',
      'halftimeChoice',
      'bloodMoon',
      'finalGoal',
      'finalWave',
      'victory',
    ]);
    expect(state.stage).toBe('victory');
    expect(state.goalsScored).toBe(2);
    expect(state.halftimeChoice).toBe('control');
    expect(state.matchElapsed).toBe(FULL_MATCH_CONFIG.bloodMoon.deadlineMatchTime);
  });

  it('applies every full-config timeout fallback and remains terminal after death', () => {
    const initial = createMatchDirectorState();
    const firstMiss = updateMatchDirector(
      {
        ...initial,
        stage: 'goalOpportunity',
        stageElapsed: FULL_MATCH_CONFIG.goalOpportunityDuration,
      },
      { dt: 0, totalKills: 0, playerDead: false },
      FULL_MATCH_CONFIG,
    );
    expect(firstMiss.events).toContainEqual({ type: 'goalMissed', goal: 'first' });

    const halftime = updateMatchDirector(
      {
        ...firstMiss.state,
        stage: 'halftimeChoice',
        stageElapsed: FULL_MATCH_CONFIG.halftimeChoiceDuration,
      },
      { dt: 0, totalKills: 0, playerDead: false },
      FULL_MATCH_CONFIG,
    );
    expect(halftime.state.halftimeChoice).toBe(FULL_MATCH_CONFIG.defaultHalftimeChoice);
    expect(halftime.events).toContainEqual({
      type: 'halftimeChoiceSelected',
      choice: FULL_MATCH_CONFIG.defaultHalftimeChoice,
      automatic: true,
    });

    const finalMiss = updateMatchDirector(
      {
        ...halftime.state,
        stage: 'finalGoal',
        stageElapsed: FULL_MATCH_CONFIG.finalGoalDuration,
      },
      { dt: 0, totalKills: 0, playerDead: false },
      FULL_MATCH_CONFIG,
    );
    expect(finalMiss.state.stage).toBe('finalWave');
    expect(finalMiss.events).toContainEqual({ type: 'goalMissed', goal: 'final' });

    const deadlineVictory = updateMatchDirector(
      finalMiss.state,
      {
        dt: FULL_MATCH_CONFIG.finalWave.deadlineMatchTime - finalMiss.state.matchElapsed,
        totalKills: 0,
        playerDead: false,
      },
      FULL_MATCH_CONFIG,
    );
    expect(deadlineVictory.state.stage).toBe('victory');
    expect(deadlineVictory.events).toContainEqual({ type: 'victory' });

    const death = updateMatchDirector(
      finalMiss.state,
      {
        dt: 1 / 60,
        totalKills: 0,
        playerDead: true,
      },
      FULL_MATCH_CONFIG,
    );
    const afterDeath = updateMatchDirector(
      death.state,
      {
        dt: 120,
        totalKills: 999,
        playerDead: false,
        bossDefeated: true,
      },
      FULL_MATCH_CONFIG,
    );
    expect(death.state.stage).toBe('dead');
    expect(afterDeath.state).toBe(death.state);
    expect(afterDeath.events).toEqual([]);
  });
});
