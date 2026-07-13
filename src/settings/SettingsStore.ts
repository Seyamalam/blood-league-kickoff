export type RenderQuality = 'performance' | 'balanced' | 'quality';
export type FpsLimit = 60 | 120 | 'unlimited';

export interface PlayerSettings {
  masterVolume: number;
  mouseSensitivity: number;
  renderQuality: RenderQuality;
  renderScale: number;
  fpsLimit: FpsLimit;
  reducedCameraShake: boolean;
}

export type SettingsListener = (settings: Readonly<PlayerSettings>) => void;

const SETTINGS_VERSION = 1;
const DEFAULT_STORAGE_KEY = 'blood-league-kickoff.settings';

export const DEFAULT_PLAYER_SETTINGS: Readonly<PlayerSettings> = Object.freeze({
  masterVolume: 0.42,
  mouseSensitivity: 1,
  renderQuality: 'balanced',
  renderScale: 1,
  fpsLimit: 120,
  reducedCameraShake: false,
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
    return { ...this.settings };
  }

  /** Validates, persists, and broadcasts a partial update. */
  public update(patch: Partial<PlayerSettings>): Readonly<PlayerSettings> {
    const next = sanitizeSettings({ ...this.settings, ...patch });
    if (settingsEqual(this.settings, next)) return this.value;
    this.settings = next;
    this.persist();
    this.emit();
    return this.value;
  }

  public reset(): Readonly<PlayerSettings> {
    this.settings = { ...DEFAULT_PLAYER_SETTINGS };
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
      if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_PLAYER_SETTINGS };
      const serialized = window.localStorage.getItem(this.storageKey);
      if (!serialized) return { ...DEFAULT_PLAYER_SETTINGS };
      const parsed: unknown = JSON.parse(serialized);
      if (!isRecord(parsed)) return { ...DEFAULT_PLAYER_SETTINGS };
      const stored = parsed.version === SETTINGS_VERSION && isRecord(parsed.settings)
        ? parsed.settings
        : parsed;
      return sanitizeSettings(stored);
    } catch {
      return { ...DEFAULT_PLAYER_SETTINGS };
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

function sanitizeSettings(value: Record<string, unknown>): PlayerSettings {
  return {
    masterVolume: boundedNumber(value.masterVolume, 0, 1, DEFAULT_PLAYER_SETTINGS.masterVolume),
    mouseSensitivity: boundedNumber(value.mouseSensitivity, 0.25, 2.5, DEFAULT_PLAYER_SETTINGS.mouseSensitivity),
    renderQuality: isRenderQuality(value.renderQuality) ? value.renderQuality : DEFAULT_PLAYER_SETTINGS.renderQuality,
    renderScale: boundedNumber(value.renderScale, 0.5, 1.25, DEFAULT_PLAYER_SETTINGS.renderScale),
    fpsLimit: isFpsLimit(value.fpsLimit) ? value.fpsLimit : DEFAULT_PLAYER_SETTINGS.fpsLimit,
    reducedCameraShake: typeof value.reducedCameraShake === 'boolean'
      ? value.reducedCameraShake
      : DEFAULT_PLAYER_SETTINGS.reducedCameraShake,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function settingsEqual(left: PlayerSettings, right: PlayerSettings): boolean {
  return left.masterVolume === right.masterVolume
    && left.mouseSensitivity === right.mouseSensitivity
    && left.renderQuality === right.renderQuality
    && left.renderScale === right.renderScale
    && left.fpsLimit === right.fpsLimit
    && left.reducedCameraShake === right.reducedCameraShake;
}
