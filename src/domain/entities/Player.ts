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
export type InjuryStatus = "Healthy" | "Questionable" | "Doubtful" | "Out" | "IR" | "PUP" | "Sus";

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
 *
 * `team`, `injuryStatus`, and `number` are nullable because Sleeper
 * omits them for free agents and players without reported status.
 */
export type Player = {
  readonly playerId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly age: number;
  readonly team: NflTeam | null;
  readonly position: Position;
  readonly height: string;
  readonly weight: number;
  readonly injuryStatus: InjuryStatus | null;
  readonly status: "active" | "inactive";
  readonly number: number | null;
};
