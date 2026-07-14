import { describe, expect, it } from 'vitest';
import {
  createDynamicMatchAudioState,
  updateDynamicMatchAudio,
  type DynamicMatchAudioPort,
} from './DynamicMatchAudio';

class AudioSpy implements DynamicMatchAudioPort {
  public readonly calls: string[] = [];
  public intensity: number | 'paused' = 0;
  setMatchIntensity(value: number | 'paused'): void {
    this.intensity = value;
  }
  playKickoff(): void {
    this.calls.push('kickoff');
  }
  playPhase(value = 0): void {
    this.calls.push(`phase:${value}`);
  }
  playHalftime(): void {
    this.calls.push('halftime');
  }
  playBloodMoon(): void {
    this.calls.push('bloodMoon');
  }
  playFinalWave(): void {
    this.calls.push('finalWave');
  }
  playMinibossEntrance(): void {
    this.calls.push('miniboss');
  }
  playBossEntrance(): void {
    this.calls.push('bossEntrance');
  }
  playBossPhase(value: 'bloodRush' | 'desperation' | number): void {
    this.calls.push(`boss:${value}`);
  }
  playGoalkeeperDefeat(): void {
    this.calls.push('goalkeeperDefeat');
  }
  playCrowdRise(value = 0.65): void {
    this.calls.push(`crowd:${value}`);
  }
  playGoal(): void {
    this.calls.push('goal');
  }
  playVictory(): void {
    this.calls.push('victory');
  }
  playDefeat(): void {
    this.calls.push('defeat');
  }
}

describe('dynamic match audio', () => {
  it('smooths deterministic score and crowd state from combat telemetry', () => {
    const audio = new AudioSpy();
    const first = updateDynamicMatchAudio(
      createDynamicMatchAudioState(),
      { dt: 0.5, phaseId: 'first-half', combatPressure: 0.8, playerHealthRatio: 0.25, combo: 20 },
      audio,
    );
    expect(first.scoreIntensity).toBeGreaterThan(0.45);
    expect(first.crowdIntensity).toBeGreaterThan(0.2);
    expect(audio.intensity).toBe(first.scoreIntensity);
    expect(audio.calls).toContain('phase:1');

    const replayAudio = new AudioSpy();
    const replay = updateDynamicMatchAudio(
      createDynamicMatchAudioState(),
      { dt: 0.5, phaseId: 'first-half', combatPressure: 0.8, playerHealthRatio: 0.25, combo: 20 },
      replayAudio,
    );
    expect(replay).toEqual(first);
  });

  it('cues authored match moments only when their phase is entered', () => {
    const audio = new AudioSpy();
    let state = createDynamicMatchAudioState();
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'kickoff' }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'kickoff' }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'rival-invasion' }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'first-miniboss' }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'halftime' }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'blood-moon' }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'final-goalkeeper' }, audio);
    updateDynamicMatchAudio(state, { dt: 0.2, phaseId: 'final-boss', bossHealthRatio: 1 }, audio);

    expect(audio.calls.filter((call) => call === 'kickoff')).toHaveLength(1);
    expect(audio.calls).toEqual(
      expect.arrayContaining(['phase:2', 'miniboss', 'halftime', 'bloodMoon', 'finalWave', 'bossEntrance']),
    );
  });

  it('tracks boss thresholds without replaying phase cues', () => {
    const audio = new AudioSpy();
    let state = updateDynamicMatchAudio(
      createDynamicMatchAudioState(),
      { dt: 0.1, phaseId: 'final-boss', bossHealthRatio: 1 },
      audio,
    );
    state = updateDynamicMatchAudio(state, { dt: 0.1, phaseId: 'final-boss', bossHealthRatio: 0.6 }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.1, phaseId: 'final-boss', bossHealthRatio: 0.2 }, audio);
    updateDynamicMatchAudio(state, { dt: 0.1, phaseId: 'final-boss', bossHealthRatio: 0.1 }, audio);
    expect(audio.calls.filter((call) => call === 'bossEntrance')).toHaveLength(1);
    expect(audio.calls.filter((call) => call === 'boss:bloodRush')).toHaveLength(1);
    expect(audio.calls.filter((call) => call === 'boss:desperation')).toHaveLength(1);
  });

  it('plays terminal and scoring cues once and supports pause routing', () => {
    const audio = new AudioSpy();
    let state = updateDynamicMatchAudio(
      createDynamicMatchAudioState(),
      { dt: 0.25, phaseId: 'final-goalkeeper', paused: true, goalScored: true, goalkeeperDefeated: true },
      audio,
    );
    expect(audio.intensity).toBe('paused');
    expect(audio.calls).toContain('goal');
    expect(audio.calls).toContain('goalkeeperDefeat');

    state = updateDynamicMatchAudio(state, { dt: 0.25, phaseId: 'full-time', victory: true }, audio);
    state = updateDynamicMatchAudio(state, { dt: 0.25, phaseId: 'full-time', victory: true }, audio);
    expect(audio.calls.filter((call) => call === 'victory')).toHaveLength(1);
    expect(state.outcome).toBe('victory');
  });
});
