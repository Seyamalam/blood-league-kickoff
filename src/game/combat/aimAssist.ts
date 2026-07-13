import type { AimAssistStrength } from '../../settings/SettingsStore';

export interface AimVector {
  readonly x: number;
  readonly z: number;
}

export interface AimAssistCandidate {
  readonly id: number;
  readonly position: AimVector;
}

export interface AimAssistTarget {
  readonly id: number;
  readonly direction: AimVector;
  readonly distance: number;
}

interface AimAssistProfile {
  readonly maximumDistance: number;
  readonly coneCosine: number;
  readonly correction: number;
}

const PROFILES: Readonly<Record<AimAssistStrength, AimAssistProfile>> = Object.freeze({
  off: { maximumDistance: 0, coneCosine: 1, correction: 0 },
  low: { maximumDistance: 10, coneCosine: Math.cos((7.5 * Math.PI) / 180), correction: 0.3 },
  high: { maximumDistance: 14, coneCosine: Math.cos((15 * Math.PI) / 180), correction: 0.65 },
});

/** Chooses the candidate closest to the reticle, then distance, then stable ID. */
export function selectAimAssistTarget(
  origin: AimVector,
  forward: AimVector,
  candidates: readonly AimAssistCandidate[],
  strength: AimAssistStrength,
): AimAssistTarget | null {
  const profile = PROFILES[strength];
  const normalizedForward = normalize(forward);
  if (!normalizedForward || profile.correction === 0) return null;

  let best: (AimAssistTarget & { alignment: number }) | null = null;
  for (const candidate of candidates) {
    const offsetX = candidate.position.x - origin.x;
    const offsetZ = candidate.position.z - origin.z;
    const distance = Math.hypot(offsetX, offsetZ);
    if (distance === 0 || distance > profile.maximumDistance) continue;

    const direction = { x: offsetX / distance, z: offsetZ / distance };
    const alignment = normalizedForward.x * direction.x + normalizedForward.z * direction.z;
    if (alignment < profile.coneCosine) continue;
    if (
      !best ||
      alignment > best.alignment + Number.EPSILON ||
      (Math.abs(alignment - best.alignment) <= Number.EPSILON &&
        (distance < best.distance || (distance === best.distance && candidate.id < best.id)))
    ) {
      best = { id: candidate.id, direction, distance, alignment };
    }
  }

  if (!best) return null;
  return { id: best.id, direction: best.direction, distance: best.distance };
}

/** Gently steers a normalized aim vector toward a selected target. */
export function steerAimDirection(
  forward: AimVector,
  targetDirection: AimVector,
  strength: AimAssistStrength,
): AimVector {
  const normalizedForward = normalize(forward);
  const normalizedTarget = normalize(targetDirection);
  if (!normalizedForward) return { x: 0, z: 0 };
  const correction = PROFILES[strength].correction;
  if (!normalizedTarget || correction === 0) return normalizedForward;
  return (
    normalize({
      x: normalizedForward.x + (normalizedTarget.x - normalizedForward.x) * correction,
      z: normalizedForward.z + (normalizedTarget.z - normalizedForward.z) * correction,
    }) ?? normalizedForward
  );
}

function normalize(vector: AimVector): AimVector | null {
  const length = Math.hypot(vector.x, vector.z);
  if (!Number.isFinite(length) || length <= Number.EPSILON) return null;
  return { x: vector.x / length, z: vector.z / length };
}
