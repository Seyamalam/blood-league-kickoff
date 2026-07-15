import { describe, expect, it } from 'vitest';
import { CODEX_PREVIEW_STATES, isCodexPreviewState } from './CharacterCodexPreview';

describe('CharacterCodexPreview contract', () => {
  it('offers locomotion, technique, tackle, and outcome samples', () => {
    expect(CODEX_PREVIEW_STATES).toEqual(['idle', 'dribble', 'shoot', 'slideTackle', 'victory']);
  });

  it('rejects arbitrary animation names', () => {
    expect(isCodexPreviewState('shoot')).toBe(true);
    expect(isCodexPreviewState('commercial-player-celebration')).toBe(false);
  });
});
