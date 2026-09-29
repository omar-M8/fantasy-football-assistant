// This file defines the Player entity and related types for the NFL domain.

/**
 * Represents a player's position in football.
 * Possible values are:
 * - "QB" for Quarterback
 * - "RB" for Running Back
 * - "WR" for Wide Receiver
 * - "TE" for Tight End
 * - "K" for Kicker
 * - "DEF" for Defense/Special Teams
 */
export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

/**
 * Represents the injury status of a player.
 * Possible values are:
 * - "healthy" for players who are not injured
 * - "questionable" for players who may play but have a risk of injury
 * - "doubtful" for players who are unlikely to play due to injury
 * - "out" for players who will not play due to injury
 * - "ir" for players on injured reserve
 * - "pup" for players on the physically unable to perform list
 * - "suspended" for players who are suspended from playing
 */
export type InjuryStatus =
  "healthy" | "questionable" | "doubtful" | "out" | "ir" | "pup" | "suspended";

// teams are represented by their three-letter abbreviations,
//  e.g., "NE" for New England Patriots, "DAL" for Dallas Cowboys, etc.
export type NflTeam =
  | "ARI"
  | "ATL"
  | "BAL"
  | "BUF"
  | "CAR"
  | "CHI"
  | "CIN"
  | "CLE"
  | "DAL"
  | "DEN"
  | "DET"
  | "GB"
  | "HOU"
  | "IND"
  | "JAX"
  | "KC"
  | "LAC"
  | "LAR"
  | "LV"
  | "MIA"
  | "MIN"
  | "NE"
  | "NO"
  | "NYG"
  | "NYJ"
  | "PHI"
  | "PIT"
  | "SEA"
  | "SF"
  | "TB"
  | "TEN"
  | "WAS";

/**
 * Represents a player in the NFL.
 * @typedef {Object} Player
 * @property {string} firstName - The player's first name
 * @property {string} lastName - The player's last name
 * @property {number} age - The player's age
 * @property {NflTeam} team - The team the player belongs to, represented by its three-letter abbreviation
 * @property {Position} position - The player's position on the field
 * @property {string} height - The player's height in feet and inches (e.g., "6'2\"")
 * @property {number} weight - The player's weight in pounds
 * @property {InjuryStatus} injuryStatus - The player's current injury status
 * @property {string} playerId - A unique identifier for the player
 * @property {number} number - The player's jersey number
 * @property {"active" | "inactive"} status - The player's current status (active or inactive)
 * @property {string} fullName - The player's full name, typically a combination of first and last name
 */
export type Player = {
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly team: NflTeam;
  readonly position: Position;
  readonly height: string;
  readonly weight: number;
  readonly injuryStatus: InjuryStatus;
  readonly playerId: string;
  readonly number: number;
  readonly status: "active" | "inactive";
  readonly fullName: string;
};
