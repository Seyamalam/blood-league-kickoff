import { describe, expect, it } from 'vitest';
import { AudioManager } from './AudioManager';

describe('AudioManager match intensity', () => {
  it('accepts match stages before browser audio is unlocked', () => {
    const audio = new AudioManager();
    audio.setMatchIntensity('opening');
    expect(audio.currentMatchIntensity).toBeCloseTo(0.24);
    audio.setMatchIntensity('bloodMoon');
    expect(audio.currentMatchIntensity).toBeCloseTo(0.78);
    audio.setMatchIntensity('finalWave');
    expect(audio.currentMatchIntensity).toBe(1);
  });

  it('clamps normalized tiers and silences terminal defeat', () => {
    const audio = new AudioManager();
    audio.setMatchIntensity(4);
    expect(audio.currentMatchIntensity).toBe(1);
    audio.setMatchIntensity(-2);
    expect(audio.currentMatchIntensity).toBe(0);
    audio.setMatchIntensity('dead');
    expect(audio.currentMatchIntensity).toBe(0);
  });

  it('tracks independently clamped music and effects levels before unlock', () => {
    const audio = new AudioManager({ musicVolume: 0.4, effectsVolume: 0.8 });
    expect(audio.currentMusicVolume).toBe(0.4);
    expect(audio.currentEffectsVolume).toBe(0.8);
    audio.setMusicVolume(-1);
    audio.setEffectsVolume(3);
    expect(audio.currentMusicVolume).toBe(0);
    expect(audio.currentEffectsVolume).toBe(1);
  });
});

describe('AudioManager event cues', () => {
  it('keeps boss and terminal cues safe before audio is unlocked', () => {
    const audio = new AudioManager();

    expect(() => {
      audio.playBossEntrance();
      audio.playBossPhase('bloodRush');
      audio.playBossPhase('desperation');
      audio.playBossPhase(2);
      audio.playEvolutionUnlock();
      audio.playUltimate();
      audio.playMinibossEntrance();
      audio.playCurseAccepted();
      audio.playVictory();
      audio.playDefeat();
    }).not.toThrow();
  });

  it('keeps expanded football, progression, match, and interface cues safe before unlock', () => {
    const audio = new AudioManager();

    expect(() => {
      audio.playDash();
      audio.playHeal();
      audio.playLifeSteal();
      audio.playPickup();
      audio.playLevelUp();
      audio.playUpgradeSelected();
      audio.playUnlock();
      audio.playNewRecord();
      audio.playWallImpact(0.5);
      audio.playPostImpact(0.8);
      audio.playCrossbarImpact(1);
      audio.playNetImpact();
      audio.playRecallCatch();
      audio.playGoalkeeperCatch();
      audio.playGoalkeeperParry();
      audio.playGoalkeeperGuardBreak();
      audio.playGoalkeeperDefeat();
      audio.playKickoff();
      audio.playGoalMissed();
      audio.playHalftime();
      audio.playBloodMoon();
      audio.playFinalWave();
      audio.playUiSelect();
      audio.playUiBack();
      audio.playUiError();
    }).not.toThrow();
  });

  it('retains distinct adaptive music intensities for newly cued match moments', () => {
    const audio = new AudioManager();
    audio.setMatchIntensity('halftimeChoice');
    expect(audio.currentMatchIntensity).toBeCloseTo(0.18);
    audio.setMatchIntensity('goalOpportunity');
    expect(audio.currentMatchIntensity).toBeCloseTo(0.62);
    audio.setMatchIntensity('bloodMoon');
    expect(audio.currentMatchIntensity).toBeCloseTo(0.78);
    audio.setMatchIntensity('finalGoal');
    expect(audio.currentMatchIntensity).toBeCloseTo(0.9);
    audio.setMatchIntensity('finalWave');
    expect(audio.currentMatchIntensity).toBe(1);
  });
});
