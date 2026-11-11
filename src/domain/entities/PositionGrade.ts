import type { Position } from "@/domain/entities/Player";

/**
 * A position grade for one team, one position.
 *
 * Grade reflects roster quality measured against the league's replacement-level players - Not
 * the user's actual starting lineup. Two teams with the same starters get the same grade
 * regardless of whether the user set their lineup in Sleeper.
 *
 * Values are averages per week of whatever points analyzePosition was given: points per
 * remaining week for rest-of-season grades, or season totals when graded on season
 * projections (a single pseudo-week).
 */
export type PositionGrade = {
  readonly rosterId: string;
  readonly position: Position;
  readonly grade: Grade;
  readonly rank: number; // 1 = best, 2 = second-best,(within the league) etc.
  readonly teamCount: number;
  readonly starterCount: number; // typical starters at this position per week (rounded average)
  readonly starterValue: number; // average points of starters at this position
  readonly replacementValue: number; // average points of the top-N free agents, N = max(starters, required slots)
  readonly surplusValue: number; // starterValue - replacementValue
};

export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "F";
