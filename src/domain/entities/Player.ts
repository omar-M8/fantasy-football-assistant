export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
export type InjuryStatus =
  "healthy" | "questionable" | "doubtful" | "out" | "ir" | "pup" | "suspended";

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
