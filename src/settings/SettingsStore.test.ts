import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_SETTINGS, sanitizePlayerSettings } from './SettingsStore';

describe('player settings sanitization', () => {
  it('migrates version-one-shaped settings with full-level child buses', () => {
    const migrated = sanitizePlayerSettings({
      masterVolume: 0.3,
      mouseSensitivity: 1.25,
      renderQuality: 'performance',
      renderScale: 0.8,
      fpsLimit: 60,
      reducedCameraShake: true,
    });
    expect(migrated.masterVolume).toBe(0.3);
    expect(migrated.musicVolume).toBe(1);
    expect(migrated.effectsVolume).toBe(1);
    expect(migrated.mouseSensitivity).toBe(1.25);
  });

  it('clamps audio values and rejects malformed values', () => {
    const settings = sanitizePlayerSettings({
      masterVolume: 8,
      musicVolume: -2,
      effectsVolume: Number.NaN,
    });
    expect(settings.masterVolume).toBe(1);
    expect(settings.musicVolume).toBe(0);
    expect(settings.effectsVolume).toBe(DEFAULT_PLAYER_SETTINGS.effectsVolume);
  });

  it('returns safe defaults for non-object storage data', () => {
    expect(sanitizePlayerSettings(null)).toEqual(DEFAULT_PLAYER_SETTINGS);
  });
});
