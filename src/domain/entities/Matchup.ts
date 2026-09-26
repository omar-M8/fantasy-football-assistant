/**
 * A single head-to-head matchup between two teams in a given week of the season
 *
 * @typedef {Object} Matchup
 * @property {number} matchupId - The unique identifier for the matchup
 * @property {number} week - The week of the season
 * @property {"scheduled" | "in_progress" | "final"} status - The status of the matchup
 * @property {string} teamAId - The ID of the first team
 * @property {number} teamAScore - The score of the first team
 * @property {string} teamBId - The ID of the second team
 * @property {number} teamBScore - The score of the second team
 */
export type Matchup = {
  readonly matchupId: string;
  readonly week: number;
  readonly status: "scheduled" | "in_progress" | "final";

  readonly teamAId: string;
  readonly teamAScore: number;

  readonly teamBId: string;
  readonly teamBScore: number;
};
