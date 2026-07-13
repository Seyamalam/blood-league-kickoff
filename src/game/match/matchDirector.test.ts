import { describe, expect, it } from 'vitest';
import { createMatchDirectorState, updateMatchDirector } from './index';

describe('match director', () => {
  it('advances the opening when its time and kill gates pass', () => {
    const state = { ...createMatchDirectorState(), matchElapsed: 7.99, stageElapsed: 7.99 };
    const update = updateMatchDirector(state, { dt: 0.02, totalKills: 4, playerDead: false });
    expect(update.state.stage).toBe('firstHalf');
    expect(update.events).toContainEqual({ type: 'stageChanged', from: 'opening', to: 'firstHalf' });
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
