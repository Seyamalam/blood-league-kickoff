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
});
