import type { ScoringFormat } from "@/domain/entities/League";
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

/**
 * Returns the projected points for a given player and scoring format.
 * @param projection The player's projection data.
 * @param format The scoring format to use.
 * @returns The projected points for the specified format.
 */
export function getProjectedPoints(projection: PlayerProjection, format: ScoringFormat): number {
  switch (format) {
    case "ppr":
      return projection.pointsPpr;
    case "half_ppr":
      return projection.pointsHalfPpr;
    case "standard":
      return projection.pointsStd;
  }
}
