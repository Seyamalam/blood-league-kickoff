import { describe, expect, it } from 'vitest';
import { createMatchModifierState, updateMatchModifiers } from './matchModifiers';
import { RIVAL_TEAM_DEFINITIONS } from './rivalTeams';

const TEAM = RIVAL_TEAM_DEFINITIONS.nightwings;

describe('match modifiers', () => {
  it('opens and closes a bounded multiball window on a deterministic cadence', () => {
    let state = { ...createMatchModifierState(TEAM), multiballCountdown: 0.05 };
    const started = updateMatchModifiers(state, { dt: 0.1, stage: 'firstHalf', ballPossessed: false }, TEAM);
    state = started.state;

    expect(started.events).toEqual([
      { type: 'multiballStarted', duration: TEAM.multiball.duration, count: TEAM.multiball.count },
    ]);
    expect(started.effects).toMatchObject({
      multiballActive: true,
      multiballCount: 3,
      multiballDamageMultiplier: 0.55,
    });

    const ended = updateMatchModifiers(
      { ...state, multiballRemaining: 0.05 },
      { dt: 0.1, stage: 'firstHalf', ballPossessed: false },
      TEAM,
    );
    expect(ended.events).toEqual([{ type: 'multiballEnded' }]);
    expect(ended.effects.multiballActive).toBe(false);
    expect(ended.state.multiballCountdown).toBe(TEAM.multiball.interval);
  });

  it('awards possession once, then enforces its cooldown', () => {
    let state = {
      ...createMatchModifierState(TEAM),
      possessionProgress: TEAM.possession.targetSeconds - 0.05,
    };
    const completed = updateMatchModifiers(state, { dt: 0.1, stage: 'bloodMoon', ballPossessed: true }, TEAM);
    state = completed.state;

    expect(completed.events).toContainEqual({
      type: 'possessionCompleted',
      scoreReward: TEAM.possession.scoreReward,
      ultimateCharge: TEAM.possession.ultimateCharge,
    });
    expect(state.possessionProgress).toBe(0);
    expect(state.possessionCooldown).toBe(TEAM.possession.cooldown);

    const cooling = updateMatchModifiers(state, { dt: 0.1, stage: 'bloodMoon', ballPossessed: true }, TEAM);
    expect(cooling.events).toEqual([]);
    expect(cooling.state.possessionProgress).toBe(0);
  });

  it('pauses objectives outside combat and clamps invalid input safely', () => {
    const state = {
      multiballCountdown: 2,
      multiballRemaining: 0,
      possessionProgress: 4,
      possessionCooldown: 0,
    };
    const paused = updateMatchModifiers(
      state,
      { dt: Number.POSITIVE_INFINITY, stage: 'halftimeChoice', ballPossessed: true },
      TEAM,
    );
    expect(paused.state.multiballCountdown).toBe(2);
    expect(paused.state.possessionProgress).toBe(0);
    expect(paused.events).toEqual([]);
  });
});
