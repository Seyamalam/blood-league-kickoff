import { describe, expect, it } from 'vitest';
import { locomotionClipFor } from './PlayerCharacterAsset';
import {
  FOOTBALL_ANIMATION_STATES,
  resolveFootballAnimation,
  resolveFootballAnimationContract,
} from './FootballAnimationContract';

describe('locomotionClipFor', () => {
  it('selects readable authored locomotion states', () => {
    expect(locomotionClipFor(0, false)).toBe('Idle_Loop');
    expect(locomotionClipFor(4, false)).toBe('Jog_Fwd_Loop');
    expect(locomotionClipFor(9, false)).toBe('Sprint_Loop');
    expect(locomotionClipFor(0, true)).toBe('Roll');
  });
});

const CURRENT_CC0_CLIPS = [
  'Idle_Loop',
  'Jog_Fwd_Loop',
  'Walk_Loop',
  'Punch_Jab',
  'Interact',
  'Spell_Simple_Shoot',
  'Punch_Cross',
  'Jump_Start',
  'Hit_Head',
  'Roll',
  'Hit_Chest',
  'Jump_Land',
  'Dance_Loop',
  'Death01',
];

describe('football animation contract', () => {
  it('covers every requested football state exactly once', () => {
    expect(FOOTBALL_ANIMATION_STATES).toEqual([
      'idle',
      'dribble',
      'strafeLeft',
      'strafeRight',
      'groundPass',
      'lobPass',
      'shoot',
      'header',
      'slideTackle',
      'bicycleKick',
      'damage',
      'knockdown',
      'celebration',
      'victory',
      'defeat',
    ]);
  });

  it('resolves deterministic, explicitly labelled aliases for the current general-purpose pack', () => {
    const resolved = resolveFootballAnimationContract(CURRENT_CC0_CLIPS);
    expect([...resolved.values()].every((entry) => entry.source === 'fallback-alias')).toBe(true);
    expect(resolved.get('shoot')?.clipName).toBe('Punch_Cross');
    expect(resolved.get('slideTackle')?.clipName).toBe('Roll');
    expect(resolved.get('victory')?.playback).toBe('terminal');
    expect(resolved.get('defeat')?.clipName).toBe('Death01');
  });

  it('prefers a dedicated football clip and preserves its exported case', () => {
    const resolved = resolveFootballAnimation('groundPass', ['punch_jab', 'Football_Ground_Pass']);
    expect(resolved).toEqual({
      state: 'groundPass',
      clipName: 'Football_Ground_Pass',
      source: 'dedicated',
      playback: 'once',
    });
  });

  it('reports unavailable instead of silently inventing a clip', () => {
    expect(resolveFootballAnimation('header', [])).toEqual({
      state: 'header',
      source: 'unavailable',
      playback: 'once',
    });
  });
});
