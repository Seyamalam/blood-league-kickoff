import { describe, expect, it } from 'vitest';
import { GAMEPAD_BUTTONS, applyStickDeadzone, normalizeKickCurveIntent } from './InputController';

describe('alternate input normalization', () => {
  it('removes stick drift and rescales useful travel', () => {
    expect(applyStickDeadzone(0.1)).toBe(0);
    expect(applyStickDeadzone(-0.16)).toBe(0);
    expect(applyStickDeadzone(1)).toBe(1);
    expect(applyStickDeadzone(-1)).toBe(-1);
    expect(applyStickDeadzone(0.58)).toBeCloseTo(0.5, 5);
  });

  it('keeps Start/Menu dedicated to pause and Back/View dedicated to restart', () => {
    expect(GAMEPAD_BUTTONS.pause).toBe(9);
    expect(GAMEPAD_BUTTONS.restart).toBe(8);
    expect(GAMEPAD_BUTTONS.pause).not.toBe(GAMEPAD_BUTTONS.restart);
    expect(GAMEPAD_BUTTONS.pass).toBe(1);
    expect(GAMEPAD_BUTTONS.lobPass).toBe(11);
  });

  it('keeps mouse curve intent bounded and deadzoned', () => {
    expect(normalizeKickCurveIntent(5)).toBe(0);
    expect(normalizeKickCurveIntent(140)).toBe(1);
    expect(normalizeKickCurveIntent(-280)).toBe(-1);
  });
});
