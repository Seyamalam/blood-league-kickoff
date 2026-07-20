import { describe, expect, it } from 'vitest';
import { CODEX_PREVIEW_STATES, isCodexPreviewState } from './CharacterCodexPreview';

describe('CharacterCodexPreview contract', () => {
  it('offers locomotion, technique, tackle, and outcome samples', () => {
    expect(CODEX_PREVIEW_STATES).toEqual([
      'idle',
      'dribble',
      'groundPass',
      'lobPass',
      'shoot',
      'header',
      'slideTackle',
      'bicycleKick',
      'celebration',
      'victory',
    ]);
  });

  it('rejects arbitrary animation names', () => {
    expect(isCodexPreviewState('shoot')).toBe(true);
    expect(isCodexPreviewState('commercial-player-celebration')).toBe(false);
  });
});
