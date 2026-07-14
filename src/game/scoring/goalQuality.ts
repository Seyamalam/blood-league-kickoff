export type GoalQuality = 'clinical' | 'power' | 'top-corner';

export interface GoalQualityResult {
  readonly quality: GoalQuality;
  readonly label: string;
  readonly score: number;
  readonly ultimateCharge: number;
}

/** Rewards deliberate placement and hard shots without making a basic goal feel weak. */
export function evaluateGoalQuality(
  crossingX: number,
  ballSpeed: number,
  goalHalfWidth = 5.4,
): GoalQualityResult {
  const placement = Math.min(1, Math.abs(crossingX) / Math.max(0.01, goalHalfWidth));
  if (placement >= 0.72 && ballSpeed >= 18) {
    return { quality: 'top-corner', label: 'TOP CORNER', score: 1_750, ultimateCharge: 34 };
  }
  if (ballSpeed >= 21) {
    return { quality: 'power', label: 'THUNDERSTRIKE', score: 1_400, ultimateCharge: 29 };
  }
  return { quality: 'clinical', label: 'CLINICAL FINISH', score: 1_000, ultimateCharge: 24 };
}
