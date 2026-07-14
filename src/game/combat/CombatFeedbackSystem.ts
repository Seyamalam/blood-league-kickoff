import type { Vec3 } from '../simulation/types';

export type ImpactKind = 'kick' | 'enemy-hit' | 'elite-hit' | 'goal' | 'player-hit' | 'boss-hit';

export interface CombatImpact {
  readonly kind: ImpactKind;
  readonly damage?: number;
  readonly direction?: Readonly<Vec3>;
  readonly perfect?: boolean;
}

export interface CombatFeedbackState {
  readonly hitStopRemaining: number;
  readonly cameraOffset: Readonly<Vec3>;
  readonly cameraRoll: number;
  readonly fovKick: number;
  readonly chromaticPulse: number;
}

const ZERO = Object.freeze({ x: 0, y: 0, z: 0 });

/**
 * Converts simulation impacts into short, bounded presentation impulses.
 * Camera/render code can sample state without combat rules depending on Three.js.
 */
export class CombatFeedbackSystem {
  private hitStopRemaining = 0;
  private impulseX = 0;
  private impulseY = 0;
  private impulseZ = 0;
  private roll = 0;
  private fovKick = 0;
  private chromaticPulse = 0;
  private sequence = 0;
  private readonly mutableState: {
    hitStopRemaining: number;
    cameraOffset: Vec3;
    cameraRoll: number;
    fovKick: number;
    chromaticPulse: number;
  } = {
    hitStopRemaining: 0,
    cameraOffset: { ...ZERO },
    cameraRoll: 0,
    fovKick: 0,
    chromaticPulse: 0,
  };

  reset(): void {
    this.hitStopRemaining = 0;
    this.impulseX = 0;
    this.impulseY = 0;
    this.impulseZ = 0;
    this.roll = 0;
    this.fovKick = 0;
    this.chromaticPulse = 0;
    this.sequence = 0;
    this.writeState();
  }

  addImpact(impact: Readonly<CombatImpact>): void {
    const profile = IMPACT_PROFILES[impact.kind];
    const damageScale = 0.7 + Math.min(1.3, Math.sqrt(safeDamage(impact.damage)) / 8);
    const perfectScale = impact.perfect ? 1.25 : 1;
    const strength = profile.strength * damageScale * perfectScale;
    const direction = normalizedHorizontal(impact.direction);
    const side = this.sequence++ % 2 === 0 ? 1 : -1;

    this.hitStopRemaining = Math.max(
      this.hitStopRemaining,
      Math.min(0.075, profile.hitStop * damageScale * perfectScale),
    );
    this.impulseX = clamp(this.impulseX - direction.x * strength + side * strength * 0.16, -0.65, 0.65);
    this.impulseY = clamp(this.impulseY + strength * profile.lift, -0.35, 0.45);
    this.impulseZ = clamp(this.impulseZ - direction.z * strength, -0.65, 0.65);
    this.roll = clamp(this.roll + side * strength * profile.roll, -0.035, 0.035);
    this.fovKick = clamp(this.fovKick + strength * profile.fov, 0, 3.2);
    this.chromaticPulse = Math.max(this.chromaticPulse, profile.chromatic * perfectScale);
  }

  /** Returns whether simulation should hold this frame for hit-stop. */
  consumeHitStop(dt: number): boolean {
    const safeDt = safeDelta(dt);
    if (this.hitStopRemaining <= 0 || safeDt <= 0) return false;
    this.hitStopRemaining = Math.max(0, this.hitStopRemaining - safeDt);
    this.writeState();
    return true;
  }

  step(dt: number): Readonly<CombatFeedbackState> {
    const safeDt = safeDelta(dt);
    this.hitStopRemaining = Math.max(0, this.hitStopRemaining - safeDt);
    const cameraDecay = Math.exp(-15 * safeDt);
    const pulseDecay = Math.exp(-9 * safeDt);
    this.impulseX *= cameraDecay;
    this.impulseY *= cameraDecay;
    this.impulseZ *= cameraDecay;
    this.roll *= cameraDecay;
    this.fovKick *= cameraDecay;
    this.chromaticPulse *= pulseDecay;
    this.writeState();
    return this.mutableState;
  }

  get state(): Readonly<CombatFeedbackState> {
    this.writeState();
    return this.mutableState;
  }

  private writeState(): void {
    this.mutableState.hitStopRemaining = this.hitStopRemaining;
    this.mutableState.cameraOffset.x = this.impulseX;
    this.mutableState.cameraOffset.y = this.impulseY;
    this.mutableState.cameraOffset.z = this.impulseZ;
    this.mutableState.cameraRoll = this.roll;
    this.mutableState.fovKick = this.fovKick;
    this.mutableState.chromaticPulse = this.chromaticPulse;
  }
}

const IMPACT_PROFILES: Readonly<
  Record<
    ImpactKind,
    { strength: number; hitStop: number; lift: number; roll: number; fov: number; chromatic: number }
  >
> = Object.freeze({
  kick: { strength: 0.13, hitStop: 0.014, lift: 0.08, roll: 0.025, fov: 1.8, chromatic: 0.08 },
  'enemy-hit': { strength: 0.1, hitStop: 0.018, lift: 0.12, roll: 0.035, fov: 0.6, chromatic: 0.1 },
  'elite-hit': { strength: 0.2, hitStop: 0.03, lift: 0.16, roll: 0.045, fov: 0.9, chromatic: 0.18 },
  goal: { strength: 0.32, hitStop: 0.052, lift: 0.34, roll: 0.025, fov: 2.8, chromatic: 0.35 },
  'player-hit': { strength: 0.24, hitStop: 0.028, lift: -0.12, roll: 0.07, fov: 0.45, chromatic: 0.5 },
  'boss-hit': { strength: 0.28, hitStop: 0.04, lift: 0.18, roll: 0.05, fov: 1.2, chromatic: 0.25 },
});

function normalizedHorizontal(direction?: Readonly<Vec3>): Readonly<Vec3> {
  if (!direction) return { x: 0, y: 0, z: 1 };
  const length = Math.hypot(direction.x, direction.z);
  if (!Number.isFinite(length) || length < 0.0001) return { x: 0, y: 0, z: 1 };
  return { x: direction.x / length, y: 0, z: direction.z / length };
}

function safeDamage(value?: number): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

function safeDelta(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(0.1, value)) : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
