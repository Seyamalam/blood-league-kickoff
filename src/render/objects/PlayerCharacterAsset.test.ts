import { describe, expect, it } from 'vitest';
import {
  PlayerCharacterAsset,
  locomotionClipFor,
  locomotionStateFor,
  rigDiagnosticsRequested,
  techniqueAnimationFor,
} from './PlayerCharacterAsset';
import { createVoxelHumanoid } from './VoxelHumanoid';
import {
  FOOTBALL_ANIMATION_STATES,
  resolveFootballAnimation,
  resolveFootballAnimationContract,
  getFootballAnimationPresentation,
} from './FootballAnimationContract';

describe('locomotionClipFor', () => {
  it('selects readable authored locomotion states', () => {
    expect(locomotionClipFor(0, false)).toBe('Idle_Loop');
    expect(locomotionClipFor(4, false)).toBe('Jog_Fwd_Loop');
    expect(locomotionClipFor(9, false)).toBe('Sprint_Loop');
    expect(locomotionClipFor(0, true)).toBe('Roll');
  });
});

describe('locomotionStateFor', () => {
  it('selects semantic idle, dribble, and lateral movement states', () => {
    expect(locomotionStateFor(0, 0, 0)).toBe('idle');
    expect(locomotionStateFor(4, 4, 0.2)).toBe('dribble');
    expect(locomotionStateFor(4, 0.2, -4)).toBe('strafeLeft');
    expect(locomotionStateFor(4, 0.2, 4)).toBe('strafeRight');
  });
});

describe('rig diagnostics opt-in', () => {
  it('requires both a development build and an explicit query flag', () => {
    expect(rigDiagnosticsRequested('?rigDebug=1', true)).toBe(true);
    expect(rigDiagnosticsRequested('?rigDebug=0', true)).toBe(false);
    expect(rigDiagnosticsRequested('', true)).toBe(false);
    expect(rigDiagnosticsRequested('?rigDebug=1', false)).toBe(false);
  });
});

describe('football technique presentation', () => {
  it('maps expanded football actions onto stable semantic animation states', () => {
    expect(techniqueAnimationFor('kick')).toBe('shoot');
    expect(techniqueAnimationFor('ground-pass')).toBe('groundPass');
    expect(techniqueAnimationFor('lob-pass')).toBe('lobPass');
    expect(techniqueAnimationFor('header')).toBe('header');
    expect(techniqueAnimationFor('slide-tackle')).toBe('slideTackle');
    expect(techniqueAnimationFor('bicycle')).toBe('bicycleKick');
  });
});

describe('voxel contact lifecycle', () => {
  it('cancels a technique contact when a stronger state interrupts it', () => {
    const rig = createVoxelHumanoid();
    const asset = new PlayerCharacterAsset(rig);
    asset.load();

    asset.playTechnique('kick');
    asset.playReaction('damage');
    asset.update(0.5, {
      position: { x: 0, y: 0, z: 0 },
      previousPosition: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: 0,
      health: 100,
      maxHealth: 100,
      invulnerability: 0,
      dashCooldown: 0,
      dashTime: 0,
      dashDirection: { x: 0, y: 0, z: 0 },
    });

    expect(asset.drainContactEvents()).toEqual([]);
    asset.dispose();
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

  it('provides normalized contact and recovery metadata without owning simulation timing', () => {
    expect(getFootballAnimationPresentation('shoot')).toEqual({
      contactAt: 0.43,
      contactSocket: 'foot_r',
      recoverAt: 0.88,
    });
    expect(getFootballAnimationPresentation('header').contactSocket).toBe('head');
    expect(getFootballAnimationPresentation('idle')).toEqual({ recoverAt: 1 });
    for (const state of FOOTBALL_ANIMATION_STATES) {
      const presentation = getFootballAnimationPresentation(state);
      expect(presentation.recoverAt).toBeGreaterThan(0);
      expect(presentation.recoverAt).toBeLessThanOrEqual(1);
      if (presentation.contactAt !== undefined) {
        expect(presentation.contactAt).toBeGreaterThanOrEqual(0);
        expect(presentation.contactAt).toBeLessThanOrEqual(presentation.recoverAt);
      }
    }
  });
});
