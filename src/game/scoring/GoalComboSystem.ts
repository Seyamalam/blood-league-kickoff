import { evaluateGoalQuality, type GoalQuality } from './goalQuality';

export type GoalStyleTag =
  'long-shot' | 'volley' | 'rebound' | 'team-move' | 'placement' | 'power' | 'streak';

export interface GoalContext {
  readonly crossingX: number;
  readonly ballSpeed: number;
  readonly shotDistance: number;
  readonly airborne: boolean;
  readonly reboundCount: number;
  /** Spectral passes, recalls, or other setup touches before the finish. */
  readonly setupTouches: number;
  readonly scoredAt: number;
}

export interface ScoredGoal {
  readonly quality: GoalQuality;
  readonly label: string;
  readonly tags: readonly GoalStyleTag[];
  readonly baseScore: number;
  readonly styleScore: number;
  readonly combo: number;
  readonly comboMultiplier: number;
  readonly totalScore: number;
  readonly ultimateCharge: number;
}

const COMBO_WINDOW_SECONDS = 38;

/**
 * Stateful but renderer-independent scoring for authored football finishes.
 * Reset it between runs; goal inputs remain suitable for replay serialization.
 */
export class GoalComboSystem {
  private lastGoalAt = Number.NEGATIVE_INFINITY;
  private combo = 0;

  reset(): void {
    this.lastGoalAt = Number.NEGATIVE_INFINITY;
    this.combo = 0;
  }

  score(context: Readonly<GoalContext>): ScoredGoal {
    const quality = evaluateGoalQuality(context.crossingX, context.ballSpeed);
    const tags: GoalStyleTag[] = [];
    let styleScore = 0;

    if (context.shotDistance >= 22) {
      tags.push('long-shot');
      styleScore += 550;
    }
    if (context.airborne) {
      tags.push('volley');
      styleScore += 425;
    }
    if (context.reboundCount > 0) {
      tags.push('rebound');
      styleScore += 250 + Math.min(2, Math.floor(context.reboundCount) - 1) * 100;
    }
    if (context.setupTouches >= 2) {
      tags.push('team-move');
      styleScore += 150 + Math.min(4, Math.floor(context.setupTouches) - 2) * 75;
    }
    if (quality.quality === 'top-corner') tags.push('placement');
    if (quality.quality === 'power') tags.push('power');

    const scoredAt = finiteNonNegative(context.scoredAt);
    this.combo = scoredAt - this.lastGoalAt <= COMBO_WINDOW_SECONDS ? Math.min(8, this.combo + 1) : 1;
    this.lastGoalAt = scoredAt;
    if (this.combo > 1) tags.push('streak');
    const comboMultiplier = 1 + (this.combo - 1) * 0.12;
    const totalScore = Math.round((quality.score + styleScore) * comboMultiplier);

    return Object.freeze({
      quality: quality.quality,
      label: buildLabel(tags, quality.label, this.combo),
      tags: Object.freeze(tags),
      baseScore: quality.score,
      styleScore,
      combo: this.combo,
      comboMultiplier,
      totalScore,
      ultimateCharge: Math.min(50, quality.ultimateCharge + tags.length * 2 + (this.combo - 1) * 2),
    });
  }
}

function buildLabel(tags: readonly GoalStyleTag[], fallback: string, combo: number): string {
  const lead = tags.includes('volley')
    ? 'NIGHT VOLLEY'
    : tags.includes('long-shot')
      ? 'HALFWAY HOWITZER'
      : tags.includes('rebound')
        ? 'POACHER REBOUND'
        : tags.includes('team-move')
          ? 'SPECTRAL TEAM GOAL'
          : fallback;
  return combo > 1 ? `${lead} · ${combo}× STREAK` : lead;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
