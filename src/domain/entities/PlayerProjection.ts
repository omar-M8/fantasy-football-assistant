/**
 * A player's projected fantasy points for the current season.
 * Sourced from Sleeper's Rotowire projections.
 *
 * Stores all three scoring formats — the domain service picks the
 * one matching the league's scoring rules.
 */
export type PlayerProjection = {
  readonly playerId: string;
  readonly pointsPpr: number;
  readonly pointsHalfPpr: number;
  readonly pointsStd: number;
};
