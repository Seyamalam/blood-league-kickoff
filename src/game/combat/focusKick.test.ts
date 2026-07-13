import { describe, expect, it } from 'vitest';
import {
  activateFocusKick,
  applyFocusKickCombatAction,
  canActivateFocusKick,
  consumeFocusKickShot,
  createFocusKickState,
  DEFAULT_FOCUS_KICK_CONFIG,
  getFocusKickTimeScale,
  resetFocusKick,
  stepFocusKick,
  type FocusKickState,
} from './focusKick';

function readyState(): FocusKickState {
  let state = createFocusKickState();
  for (let index = 0; index < 9; index += 1) {
    state = applyFocusKickCombatAction(state, 'enemy-kill');
  }
  return state;
}

describe('Focus Kick', () => {
  it('builds and clamps charge from confirmed combat actions', () => {
    let state = createFocusKickState();
    state = applyFocusKickCombatAction(state, 'enemy-hit');
    state = applyFocusKickCombatAction(state, 'goal');
    expect(state).toMatchObject({ phase: 'building', charge: 38 });

    for (let index = 0; index < 6; index += 1) {
      state = applyFocusKickCombatAction(state, 'enemy-kill');
    }
    expect(state).toMatchObject({ phase: 'ready', charge: 100 });
    expect(canActivateFocusKick(state)).toBe(true);
  });

  it('activates only when ready and requests time dilation during aiming', () => {
    const empty = createFocusKickState();
    expect(activateFocusKick(empty)).toBe(empty);

    const aiming = activateFocusKick(readyState());
    expect(aiming).toEqual({
      phase: 'aiming',
      charge: 0,
      aimTimeRemaining: DEFAULT_FOCUS_KICK_CONFIG.aimDuration,
      cooldownRemaining: 0,
    });
    expect(getFocusKickTimeScale(aiming)).toBe(DEFAULT_FOCUS_KICK_CONFIG.aimingTimeScale);
    expect(getFocusKickTimeScale(empty)).toBe(1);
  });

  it('empowers exactly one shot and starts cooldown', () => {
    const aiming = activateFocusKick(readyState());
    const first = consumeFocusKickShot(aiming);
    const second = consumeFocusKickShot(first.state);

    expect(first.empowered).toBe(true);
    expect(first.state).toMatchObject({ phase: 'cooldown', cooldownRemaining: 15 });
    expect(second.empowered).toBe(false);
    expect(second.state).toBe(first.state);
  });

  it('expires an unused aiming window and carries excess time into cooldown', () => {
    const aiming = activateFocusKick(readyState());
    const cooldown = stepFocusKick(aiming, DEFAULT_FOCUS_KICK_CONFIG.aimDuration + 2);

    expect(cooldown).toMatchObject({ phase: 'cooldown', cooldownRemaining: 13 });
    expect(stepFocusKick(cooldown, 13)).toEqual(createFocusKickState());
  });

  it('does not build meter during aiming or cooldown', () => {
    const aiming = activateFocusKick(readyState());
    expect(applyFocusKickCombatAction(aiming, 'goal')).toBe(aiming);
    const cooldown = consumeFocusKickShot(aiming).state;
    expect(applyFocusKickCombatAction(cooldown, 'goal')).toBe(cooldown);
  });

  it('ignores invalid elapsed time and resets deterministically', () => {
    const aiming = activateFocusKick(readyState());
    expect(stepFocusKick(aiming, Number.NaN)).toBe(aiming);
    expect(resetFocusKick()).toEqual(createFocusKickState());
  });
});
