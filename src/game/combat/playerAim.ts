import type { Vec3 } from '../simulation/types';
import type { AimAssistStrength } from '../../settings/SettingsStore';
import {
  selectAimAssistTarget,
  steerAimDirection,
  type AimAssistCandidate,
  type AimVector,
} from './aimAssist';

export interface PlayerAimSnapshot {
  /** Raw camera-relative intent before optional aim assistance. */
  readonly rawDirection: Readonly<Vec3>;
  /** Authoritative direction shared by presentation and gameplay. */
  readonly direction: Readonly<Vec3>;
  readonly facingYaw: number;
  readonly targetId: number | null;
}

/** Resolves one stable aim snapshot for every consumer in the current frame. */
export function resolvePlayerAim(
  origin: Readonly<AimVector>,
  rawDirection: Readonly<Vec3>,
  candidates: readonly AimAssistCandidate[],
  strength: AimAssistStrength,
): PlayerAimSnapshot {
  const y = Number.isFinite(rawDirection.y) ? clamp(rawDirection.y, -0.08, 0.2) : 0;
  const rawHorizontal = normalizeHorizontal(rawDirection) ?? { x: 0, z: -1 };
  const horizontalScale = Math.sqrt(Math.max(0, 1 - y * y));
  const raw = Object.freeze({
    x: rawHorizontal.x * horizontalScale,
    y,
    z: rawHorizontal.z * horizontalScale,
  });
  const target = selectAimAssistTarget(origin, rawHorizontal, candidates, strength);
  const assistedHorizontal = target
    ? steerAimDirection(rawHorizontal, target.direction, strength)
    : rawHorizontal;
  const direction = Object.freeze({
    x: assistedHorizontal.x * horizontalScale,
    y,
    z: assistedHorizontal.z * horizontalScale,
  });
  const facingYaw = Math.atan2(-direction.x, -direction.z);

  return Object.freeze({
    rawDirection: raw,
    direction,
    facingYaw: Object.is(facingYaw, -0) ? 0 : facingYaw,
    targetId: target?.id ?? null,
  });
}

function normalizeHorizontal(direction: Readonly<AimVector>): AimVector | null {
  const length = Math.hypot(direction.x, direction.z);
  if (!Number.isFinite(length) || length <= Number.EPSILON) return null;
  return { x: direction.x / length, z: direction.z / length };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
