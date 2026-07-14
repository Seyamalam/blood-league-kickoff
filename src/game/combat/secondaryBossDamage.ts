import type { SecondaryDamageHit } from './types';

/** Prevents one fixed simulation step of pooled secondary effects from bursting down the boss. */
export const MAX_SECONDARY_BOSS_DAMAGE_PER_STEP = 12;

/** Sums valid damage aimed at one boss target while enforcing the per-step damage ceiling. */
export function sumSecondaryBossDamage(hits: readonly SecondaryDamageHit[], targetId: number): number {
  let total = 0;
  for (const hit of hits) {
    if (hit.targetId !== targetId || !Number.isFinite(hit.damage) || hit.damage <= 0) continue;
    total += hit.damage;
    if (total >= MAX_SECONDARY_BOSS_DAMAGE_PER_STEP) return MAX_SECONDARY_BOSS_DAMAGE_PER_STEP;
  }
  return total;
}
