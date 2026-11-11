import type { ScoringFormat } from "@/domain/entities/League";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { getProjectedPoints } from "@/domain/entities/PlayerProjection";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";

/** The key season totals are stored under when they stand in for weekly points. */
export const SEASON_POINTS_KEY = 0;

/**
 * Season-long projections in the WeeklyPoints shape: one pseudo-week holding each player's
 * season total in the league's format.
 *
 * Lets season-based grading reuse the weekly code path. With a single "week", a per-week
 * average is just the season total. Used when no regular-season weeks remain, and by the
 * trade page's season-long grades.
 */
export function buildSeasonPoints(
  projections: ReadonlyMap<string, PlayerProjection>,
  format: ScoringFormat
): WeeklyPoints {
  const points = new Map<string, number>();
  for (const [playerId, projection] of projections) {
    points.set(playerId, getProjectedPoints(projection, format));
  }
  return new Map([[SEASON_POINTS_KEY, points]]);
}
