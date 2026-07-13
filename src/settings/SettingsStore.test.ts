import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLAYER_SETTINGS, sanitizePlayerSettings, SettingsStore } from './SettingsStore';

afterEach(() => vi.unstubAllGlobals());

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
    expect(migrated.aimAssistStrength).toBe('low');
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

  it('accepts only supported aim-assist strengths', () => {
    expect(sanitizePlayerSettings({ aimAssistStrength: 'off' }).aimAssistStrength).toBe('off');
    expect(sanitizePlayerSettings({ aimAssistStrength: 'high' }).aimAssistStrength).toBe('high');
    expect(sanitizePlayerSettings({ aimAssistStrength: 'maximum' }).aimAssistStrength).toBe(
      DEFAULT_PLAYER_SETTINGS.aimAssistStrength,
    );
  });

  it('persists aim assist and restores it in a new store', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    const first = new SettingsStore('test.settings');
    first.update({ aimAssistStrength: 'high' });

    expect(new SettingsStore('test.settings').value.aimAssistStrength).toBe('high');
    expect(JSON.parse(values.get('test.settings') ?? '{}')).toMatchObject({ version: 3 });
  });
});
