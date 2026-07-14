export type PhotoFilter = 'none' | 'blood-moon' | 'noir' | 'cold' | 'victory';

export interface PhotoModeState {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  readonly fov: number;
  readonly exposure: number;
  readonly filter: PhotoFilter;
  readonly hideUi: boolean;
}

export const DEFAULT_PHOTO_MODE_STATE: Readonly<PhotoModeState> = Object.freeze({
  yaw: 0,
  pitch: 0.24,
  distance: 7.5,
  fov: 52,
  exposure: 1,
  filter: 'none',
  hideUi: false,
});

export type PhotoModeListener = (state: Readonly<PhotoModeState>) => void;

/** Renderer-independent camera model shared by photo UI and a future replay camera. */
export class PhotoModeController {
  private state: PhotoModeState = { ...DEFAULT_PHOTO_MODE_STATE };
  private readonly listeners = new Set<PhotoModeListener>();

  public get value(): Readonly<PhotoModeState> {
    return { ...this.state };
  }

  public update(patch: Partial<PhotoModeState>): Readonly<PhotoModeState> {
    this.state = sanitizePhotoModeState({ ...this.state, ...patch });
    this.emit();
    return this.value;
  }

  public orbit(deltaYaw: number, deltaPitch: number): Readonly<PhotoModeState> {
    return this.update({
      yaw: this.state.yaw + finite(deltaYaw),
      pitch: this.state.pitch + finite(deltaPitch),
    });
  }

  public zoom(delta: number): Readonly<PhotoModeState> {
    return this.update({ distance: this.state.distance + finite(delta) });
  }

  public reset(): Readonly<PhotoModeState> {
    this.state = { ...DEFAULT_PHOTO_MODE_STATE };
    this.emit();
    return this.value;
  }

  public subscribe(listener: PhotoModeListener, emitCurrent = false): () => void {
    this.listeners.add(listener);
    if (emitCurrent) listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.value;
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function sanitizePhotoModeState(value: Partial<PhotoModeState>): PhotoModeState {
  return {
    yaw: wrapAngle(value.yaw ?? DEFAULT_PHOTO_MODE_STATE.yaw),
    pitch: clamp(value.pitch ?? DEFAULT_PHOTO_MODE_STATE.pitch, -1.25, 1.25),
    distance: clamp(value.distance ?? DEFAULT_PHOTO_MODE_STATE.distance, 2, 24),
    fov: clamp(value.fov ?? DEFAULT_PHOTO_MODE_STATE.fov, 24, 90),
    exposure: clamp(value.exposure ?? DEFAULT_PHOTO_MODE_STATE.exposure, 0.55, 1.6),
    filter: isPhotoFilter(value.filter) ? value.filter : 'none',
    hideUi: value.hideUi === true,
  };
}

function isPhotoFilter(value: unknown): value is PhotoFilter {
  return (
    value === 'none' || value === 'blood-moon' || value === 'noir' || value === 'cold' || value === 'victory'
  );
}

function wrapAngle(value: number): number {
  const safe = finite(value);
  return ((((safe + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finite(value)));
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
