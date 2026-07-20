import { describe, expect, it } from 'vitest';
import { AUDIO_ASSET_IDS, SOUNDTRACK_URLS, UI_SAMPLE_URLS } from './AudioAssets';

describe('sampled audio asset manifest', () => {
  it('ships three score states and a complete menu-feedback family', () => {
    expect(Object.keys(SOUNDTRACK_URLS)).toEqual(['menu', 'match', 'boss']);
    expect(Object.keys(UI_SAMPLE_URLS)).toEqual([
      'select',
      'navigate',
      'confirm',
      'open',
      'close',
      'toggle',
      'error',
    ]);
    expect(AUDIO_ASSET_IDS).toHaveLength(10);
    expect(Object.values(SOUNDTRACK_URLS).every((url) => url.endsWith('.mp3'))).toBe(true);
    expect(Object.values(UI_SAMPLE_URLS).every((url) => url.endsWith('.ogg'))).toBe(true);
  });
});
