import { describe, expect, it } from 'vitest';
import { hslToHex } from './CharacterCreatorOverlay';

describe('character creator palette helpers', () => {
  it('creates stable six-digit colors across the hue wheel', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    expect(hslToHex(480, 100, 50)).toBe('#00ff00');
  });
});
