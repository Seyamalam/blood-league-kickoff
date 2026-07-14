export type RenderQuality = 'performance' | 'balanced' | 'quality';
export type FpsLimit = 60 | 120 | 'unlimited';
export type AimAssistStrength = 'off' | 'low' | 'high';
export type ColorVisionMode = 'default' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type ControlAction =
  'moveForward' | 'moveBackward' | 'moveLeft' | 'moveRight' | 'dash' | 'recall' | 'focusKick' | 'restart';

export type KeyBindings = Record<ControlAction, string>;

export interface PlayerSettings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  mouseSensitivity: number;
  invertVerticalLook: boolean;
  renderQuality: RenderQuality;
  renderScale: number;
  fpsLimit: FpsLimit;
  aimAssistStrength: AimAssistStrength;
  reducedCameraShake: boolean;
  reducedFlashes: boolean;
  highContrastHud: boolean;
  hudScale: number;
  colorVisionMode: ColorVisionMode;
  gamepadLookSensitivity: number;
  gamepadVibration: boolean;
  keyBindings: KeyBindings;
}

export type SettingsListener = (settings: Readonly<PlayerSettings>) => void;

const SETTINGS_VERSION = 6;
const DEFAULT_STORAGE_KEY = 'blood-league-kickoff.settings';

export const DEFAULT_KEY_BINDINGS: Readonly<KeyBindings> = Object.freeze({
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  dash: 'Space',
  recall: 'KeyE',
  focusKick: 'KeyF',
  restart: 'KeyR',
});

export const DEFAULT_PLAYER_SETTINGS: Readonly<PlayerSettings> = Object.freeze({
  masterVolume: 0.42,
  musicVolume: 1,
  effectsVolume: 1,
  mouseSensitivity: 1,
  invertVerticalLook: false,
  renderQuality: 'balanced',
  renderScale: 1,
  fpsLimit: 120,
  aimAssistStrength: 'low',
  reducedCameraShake: false,
  reducedFlashes: false,
  highContrastHud: false,
  hudScale: 1,
  colorVisionMode: 'default',
  gamepadLookSensitivity: 1,
  gamepadVibration: true,
  keyBindings: DEFAULT_KEY_BINDINGS,
});

/**
 * Persistent, schema-validated player settings.
 *
 * localStorage is best-effort: privacy mode, sandboxing, or a full quota can make
 * it throw. In those cases this store continues as an in-memory settings source.
 */
export class SettingsStore {
  private settings: PlayerSettings;
  private readonly listeners = new Set<SettingsListener>();

  public constructor(private readonly storageKey = DEFAULT_STORAGE_KEY) {
    this.settings = this.load();
  }

  public get value(): Readonly<PlayerSettings> {
    return { ...this.settings, keyBindings: { ...this.settings.keyBindings } };
  }

  /** Validates, persists, and broadcasts a partial update. */
  public update(patch: Partial<PlayerSettings>): Readonly<PlayerSettings> {
    const next = sanitizePlayerSettings({ ...this.settings, ...patch });
    if (settingsEqual(this.settings, next)) return this.value;
    this.settings = next;
    this.persist();
    this.emit();
    return this.value;
  }

  public reset(): Readonly<PlayerSettings> {
    this.settings = { ...DEFAULT_PLAYER_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
    this.persist();
    this.emit();
    return this.value;
  }

  /** Returns an unsubscribe function. */
  public subscribe(listener: SettingsListener, emitCurrent = false): () => void {
    this.listeners.add(listener);
    if (emitCurrent) listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private load(): PlayerSettings {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return defaultPlayerSettings();
      const serialized = window.localStorage.getItem(this.storageKey);
      if (!serialized) return defaultPlayerSettings();
      const parsed: unknown = JSON.parse(serialized);
      if (!isRecord(parsed)) return defaultPlayerSettings();
      const version = parsed.version;
      const wrappedSettings =
        (version === 1 ||
          version === 2 ||
          version === 3 ||
          version === 4 ||
          version === 5 ||
          version === SETTINGS_VERSION) &&
        isRecord(parsed.settings)
          ? parsed.settings
          : null;
      if ('version' in parsed && !wrappedSettings) return defaultPlayerSettings();
      return sanitizePlayerSettings(wrappedSettings ?? parsed);
    } catch {
      return defaultPlayerSettings();
    }
  }

  private persist(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(
        this.storageKey,
        JSON.stringify({ version: SETTINGS_VERSION, settings: this.settings }),
      );
    } catch {
      // Persistence is optional; the in-memory value remains authoritative.
    }
  }

  private emit(): void {
    const snapshot = this.value;
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function sanitizePlayerSettings(value: unknown): PlayerSettings {
  const source = isRecord(value) ? value : {};
  return {
    masterVolume: boundedNumber(source.masterVolume, 0, 1, DEFAULT_PLAYER_SETTINGS.masterVolume),
    musicVolume: boundedNumber(source.musicVolume, 0, 1, DEFAULT_PLAYER_SETTINGS.musicVolume),
    effectsVolume: boundedNumber(source.effectsVolume, 0, 1, DEFAULT_PLAYER_SETTINGS.effectsVolume),
    mouseSensitivity: boundedNumber(
      source.mouseSensitivity,
      0.25,
      2.5,
      DEFAULT_PLAYER_SETTINGS.mouseSensitivity,
    ),
    invertVerticalLook:
      typeof source.invertVerticalLook === 'boolean'
        ? source.invertVerticalLook
        : DEFAULT_PLAYER_SETTINGS.invertVerticalLook,
    renderQuality: isRenderQuality(source.renderQuality)
      ? source.renderQuality
      : DEFAULT_PLAYER_SETTINGS.renderQuality,
    renderScale: boundedNumber(source.renderScale, 0.5, 1.25, DEFAULT_PLAYER_SETTINGS.renderScale),
    fpsLimit: isFpsLimit(source.fpsLimit) ? source.fpsLimit : DEFAULT_PLAYER_SETTINGS.fpsLimit,
    aimAssistStrength: isAimAssistStrength(source.aimAssistStrength)
      ? source.aimAssistStrength
      : DEFAULT_PLAYER_SETTINGS.aimAssistStrength,
    reducedCameraShake:
      typeof source.reducedCameraShake === 'boolean'
        ? source.reducedCameraShake
        : DEFAULT_PLAYER_SETTINGS.reducedCameraShake,
    reducedFlashes:
      typeof source.reducedFlashes === 'boolean'
        ? source.reducedFlashes
        : DEFAULT_PLAYER_SETTINGS.reducedFlashes,
    highContrastHud:
      typeof source.highContrastHud === 'boolean'
        ? source.highContrastHud
        : DEFAULT_PLAYER_SETTINGS.highContrastHud,
    hudScale: boundedNumber(source.hudScale, 0.8, 1.4, DEFAULT_PLAYER_SETTINGS.hudScale),
    colorVisionMode: isColorVisionMode(source.colorVisionMode)
      ? source.colorVisionMode
      : DEFAULT_PLAYER_SETTINGS.colorVisionMode,
    gamepadLookSensitivity: boundedNumber(
      source.gamepadLookSensitivity,
      0.4,
      2.5,
      DEFAULT_PLAYER_SETTINGS.gamepadLookSensitivity,
    ),
    gamepadVibration:
      typeof source.gamepadVibration === 'boolean'
        ? source.gamepadVibration
        : DEFAULT_PLAYER_SETTINGS.gamepadVibration,
    keyBindings: sanitizeKeyBindings(source.keyBindings),
  };
}

export function sanitizeKeyBindings(value: unknown): KeyBindings {
  const source = isRecord(value) ? value : {};
  const bindings = Object.fromEntries(
    CONTROL_ACTIONS.map((action) => {
      const candidate = source[action];
      return [action, isBindableKeyboardCode(candidate) ? candidate : DEFAULT_KEY_BINDINGS[action]];
    }),
  ) as KeyBindings;

  const usage = new Map<string, number>();
  for (const action of CONTROL_ACTIONS) {
    const code = bindings[action];
    usage.set(code, (usage.get(code) ?? 0) + 1);
  }
  for (const action of CONTROL_ACTIONS) {
    if ((usage.get(bindings[action]) ?? 0) > 1 && bindings[action] !== DEFAULT_KEY_BINDINGS[action]) {
      bindings[action] = DEFAULT_KEY_BINDINGS[action];
    }
  }
  return bindings;
}

export function isBindableKeyboardCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Backspace|CapsLock|Home|End|PageUp|PageDown|Insert|Delete|Numpad[0-9]|Numpad(Add|Subtract|Multiply|Divide|Decimal)|Bracket(Left|Right)|Semicolon|Quote|Comma|Period|Slash|Backslash|Minus|Equal|Backquote)$/.test(
      value,
    )
  );
}

export const CONTROL_ACTIONS: readonly ControlAction[] = [
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
  'dash',
  'recall',
  'focusKick',
  'restart',
];

function defaultPlayerSettings(): PlayerSettings {
  return { ...DEFAULT_PLAYER_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
}

function boundedNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function isRenderQuality(value: unknown): value is RenderQuality {
  return value === 'performance' || value === 'balanced' || value === 'quality';
}

function isFpsLimit(value: unknown): value is FpsLimit {
  return value === 60 || value === 120 || value === 'unlimited';
}

function isAimAssistStrength(value: unknown): value is AimAssistStrength {
  return value === 'off' || value === 'low' || value === 'high';
}

function isColorVisionMode(value: unknown): value is ColorVisionMode {
  return value === 'default' || value === 'deuteranopia' || value === 'protanopia' || value === 'tritanopia';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function settingsEqual(left: PlayerSettings, right: PlayerSettings): boolean {
  return (
    left.masterVolume === right.masterVolume &&
    left.musicVolume === right.musicVolume &&
    left.effectsVolume === right.effectsVolume &&
    left.mouseSensitivity === right.mouseSensitivity &&
    left.invertVerticalLook === right.invertVerticalLook &&
    left.renderQuality === right.renderQuality &&
    left.renderScale === right.renderScale &&
    left.fpsLimit === right.fpsLimit &&
    left.aimAssistStrength === right.aimAssistStrength &&
    left.reducedCameraShake === right.reducedCameraShake &&
    left.reducedFlashes === right.reducedFlashes &&
    left.highContrastHud === right.highContrastHud &&
    left.hudScale === right.hudScale &&
    left.colorVisionMode === right.colorVisionMode &&
    left.gamepadLookSensitivity === right.gamepadLookSensitivity &&
    left.gamepadVibration === right.gamepadVibration &&
    CONTROL_ACTIONS.every((action) => left.keyBindings[action] === right.keyBindings[action])
  );
}
