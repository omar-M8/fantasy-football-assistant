import type { Position } from "@/domain/entities/Player";

/**
 * A position grade for one team, one position.
 *
 * Grade reflects roster quality measured against the league's replacement-level players - Not
 * the user's actual starting lineup. Two teams with the same starters get the same grade
 * regardless of whether the user set their lineup in Sleeper.
 *
 * @property position The position this grade is for.
 * @property grade The grade for this position, based on the team's starter value vs. replacement value.
 * @property rank The rank of this position among all teams in the league (1 = best, 2 = second best, etc.).
 * @property teamCount The number of teams in the league that have a player at this position.
 * @property starterCount The number of starters at this position for this team.
 * @property starterValue The total projected points for the starters at this position for this team.
 * @property replacementValue The total projected points for the replacement-level players at this position for this team.
 * @property surplusValue The difference between the starter value and the replacement value for this position for this team.
 *
 * @remarks
 * This type is used to represent the quality of a team's roster at a specific position,
 * allowing for comparison across teams in the league. It is particularly useful for
 * evaluating team strengths and weaknesses in fantasy football.
 */
export type PositionGrade = {
  readonly position: Position;
  readonly grade: Grade;
  readonly rank: number;
  readonly teamCount: number;
  readonly starterCount: number;
  readonly starterValue: number;
  readonly replacementValue: number;
  readonly surplusValue: number;
};

export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "F";
