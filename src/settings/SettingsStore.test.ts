import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_PLAYER_SETTINGS,
  sanitizeKeyBindings,
  sanitizePlayerSettings,
  SettingsStore,
} from './SettingsStore';

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
    expect(migrated.invertVerticalLook).toBe(false);
    expect(migrated.aimAssistStrength).toBe('low');
    expect(migrated.keyBindings).toEqual(DEFAULT_KEY_BINDINGS);
    expect(migrated).toMatchObject({
      screenShakeIntensity: 0.28,
      reducedMotion: false,
      damageNumbers: true,
      reducedFlashes: false,
      highContrastHud: false,
      hudScale: 1,
      colorVisionMode: 'default',
      stadiumSelection: 'random',
      gamepadLookSensitivity: 1,
      gamepadVibration: true,
    });
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

  it('accepts authored and random stadium selections', () => {
    expect(sanitizePlayerSettings({ stadiumSelection: 'emerald-cathedral' }).stadiumSelection).toBe(
      'emerald-cathedral',
    );
    expect(sanitizePlayerSettings({ stadiumSelection: 'random' }).stadiumSelection).toBe('random');
    expect(sanitizePlayerSettings({ stadiumSelection: 'parking-lot' }).stadiumSelection).toBe('random');
  });

  it('accepts only boolean vertical-look inversion values', () => {
    expect(sanitizePlayerSettings({ invertVerticalLook: true }).invertVerticalLook).toBe(true);
    expect(sanitizePlayerSettings({ invertVerticalLook: 'true' }).invertVerticalLook).toBe(false);
  });

  it('validates accessibility and gamepad settings', () => {
    expect(
      sanitizePlayerSettings({
        reducedFlashes: true,
        reducedMotion: true,
        damageNumbers: false,
        screenShakeIntensity: 9,
        highContrastHud: true,
        hudScale: 9,
        colorVisionMode: 'tritanopia',
        gamepadLookSensitivity: 0.1,
        gamepadVibration: false,
      }),
    ).toMatchObject({
      reducedFlashes: true,
      reducedMotion: true,
      damageNumbers: false,
      screenShakeIntensity: 1,
      highContrastHud: true,
      hudScale: 1.4,
      colorVisionMode: 'tritanopia',
      gamepadLookSensitivity: 0.4,
      gamepadVibration: false,
    });
    expect(sanitizePlayerSettings({ colorVisionMode: 'rainbow' }).colorVisionMode).toBe('default');
  });

  it('accepts keyboard codes while rejecting reserved, mouse, malformed, and duplicate bindings', () => {
    expect(
      sanitizeKeyBindings({
        moveForward: 'ArrowUp',
        moveBackward: 'Mouse0',
        moveLeft: 'Escape',
        moveRight: '<script>',
        dash: 'KeyE',
        recall: 'KeyE',
        focusKick: 'KeyQ',
        restart: 'KeyQ',
      }),
    ).toEqual({
      ...DEFAULT_KEY_BINDINGS,
      moveForward: 'ArrowUp',
    });
  });

  it('loads a version-three save with default keyboard bindings', () => {
    const values = new Map<string, string>([
      [
        'legacy.settings',
        JSON.stringify({
          version: 3,
          settings: { masterVolume: 0.25, aimAssistStrength: 'high' },
        }),
      ],
    ]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    const migrated = new SettingsStore('legacy.settings').value;
    expect(migrated.masterVolume).toBe(0.25);
    expect(migrated.aimAssistStrength).toBe('high');
    expect(migrated.keyBindings).toEqual(DEFAULT_KEY_BINDINGS);
  });

  it('loads a version-four save with non-inverted vertical look by default', () => {
    const values = new Map<string, string>([
      [
        'version-four.settings',
        JSON.stringify({
          version: 4,
          settings: { mouseSensitivity: 1.4 },
        }),
      ],
    ]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    const migrated = new SettingsStore('version-four.settings').value;
    expect(migrated.mouseSensitivity).toBe(1.4);
    expect(migrated.invertVerticalLook).toBe(false);
  });

  it('persists aim assist, vertical inversion, and keyboard bindings and restores them in a new store', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    const first = new SettingsStore('test.settings');
    first.update({
      aimAssistStrength: 'high',
      invertVerticalLook: true,
      keyBindings: {
        ...first.value.keyBindings,
        dash: 'ShiftLeft',
        focusKick: 'KeyG',
        characterUltimate: 'KeyQ',
      },
    });

    const restored = new SettingsStore('test.settings').value;
    expect(restored.aimAssistStrength).toBe('high');
    expect(restored.invertVerticalLook).toBe(true);
    expect(restored.keyBindings.dash).toBe('ShiftLeft');
    expect(restored.keyBindings.focusKick).toBe('KeyG');
    expect(restored.keyBindings.characterUltimate).toBe('KeyQ');
    expect(JSON.parse(values.get('test.settings') ?? '{}')).toMatchObject({ version: 9 });
  });
});
