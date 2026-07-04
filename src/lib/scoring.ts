/**
 * Pure scoring logic for the World Cup predictions game.
 *
 * Rules (per match):
 *   +2  correct qualifier   — predicting the team that advances (knockout only)
 *   +1  exact goal difference after 90 minutes
 *   +1  exact score after 90 minutes
 *
 * Note that an exact score also satisfies the goal-difference rule, so a
 * perfect knockout prediction is worth 4 points (2 + 1 + 1).
 */

export type Side = "HOME" | "AWAY";

export interface ScoreLine {
  homeScore: number;
  awayScore: number;
}

export interface MatchResult extends ScoreLine {
  /** Side that qualified/advanced. Null if the match is not decided yet. */
  qualifier?: Side | null;
}

export interface Prediction extends ScoreLine {
  qualifier?: Side | null;
}

export interface ScoreBreakdown {
  exactScore: number;
  goalDifference: number;
  qualifier: number;
  total: number;
}

export const POINTS = {
  QUALIFIER: 2,
  GOAL_DIFFERENCE: 1,
  EXACT_SCORE: 1,
} as const;

/**
 * The winner implied by a score line: a non-draw score names a winner even if
 * the predictor never tapped a team. A draw implies nobody.
 */
export function impliedQualifier(
  homeScore: number,
  awayScore: number,
): Side | null {
  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return null;
}

/**
 * Score a single prediction against a final result.
 *
 * @param isKnockout whether the qualifier point is in play for this match.
 */
export function scorePrediction(
  prediction: Prediction,
  result: MatchResult,
  isKnockout: boolean,
): ScoreBreakdown {
  const exactScore =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore
      ? POINTS.EXACT_SCORE
      : 0;

  const goalDifference =
    prediction.homeScore - prediction.awayScore ===
    result.homeScore - result.awayScore
      ? POINTS.GOAL_DIFFERENCE
      : 0;

  // On both sides, use the explicitly chosen team if there is one; otherwise
  // fall back to the winner implied by the (non-draw) 90-minute score. A
  // decisive knockout result names its winner even if "advances" was never set;
  // a 90-minute draw (settled in extra time / on penalties) does not, so the
  // actual advancing team must be recorded for those.
  const predictedQualifier =
    prediction.qualifier ??
    impliedQualifier(prediction.homeScore, prediction.awayScore);
  const actualQualifier =
    result.qualifier ?? impliedQualifier(result.homeScore, result.awayScore);

  const qualifier =
    isKnockout &&
    !!predictedQualifier &&
    !!actualQualifier &&
    predictedQualifier === actualQualifier
      ? POINTS.QUALIFIER
      : 0;

  return {
    exactScore,
    goalDifference,
    qualifier,
    total: exactScore + goalDifference + qualifier,
  };
}

/** True when a match has a usable final result to score against. */
export function hasResult<
  T extends { homeScore?: number | null; awayScore?: number | null },
>(result: T | null | undefined): result is T & { homeScore: number; awayScore: number } {
  return (
    !!result &&
    typeof result.homeScore === "number" &&
    typeof result.awayScore === "number"
  );
}

/** The maximum points obtainable on a match (depends on knockout flag). */
export function maxPoints(isKnockout: boolean): number {
  return (
    POINTS.EXACT_SCORE +
    POINTS.GOAL_DIFFERENCE +
    (isKnockout ? POINTS.QUALIFIER : 0)
  );
}
