import type { Position } from "@/domain/entities/Player";

/**
 * A position grade for one team, one position.
 *
 * Grade reflects roster quality measured against the league's replacement-level players - Not
 * the user's actual starting lineup. Two teams with the same starters get the same grade
 * regardless of whether the user set their lineup in Sleeper.
 */
export type PositionGrade = {
  readonly rosterId: string;
  readonly position: Position;
  readonly grade: Grade;
  readonly rank: number; // 1 = best, 2 = second-best,(within the league) etc.
  readonly teamCount: number;
  readonly starterCount: number; // varies by position, e.g. 1 for QB, 2 for RB, 3 for WR, etc.
  readonly starterValue: number; // sum of projected points for starters at this position
  readonly replacementValue: number; // top-N free agents, N = starterCount
  readonly surplusValue: number; // starterValue - replacementValue
};

export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "F";
