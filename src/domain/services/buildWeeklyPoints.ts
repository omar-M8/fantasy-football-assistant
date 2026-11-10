import type { ScoringFormat } from "@/domain/entities/League";
import type { Player } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { getAvailablePoints } from "@/domain/services/getAvailablePoints";

/** week → (playerId → points). The shape computeTeamValue and the trade logic consume. */
export type WeeklyPoints = ReadonlyMap<number, ReadonlyMap<string, number>>;

/**
 * Turns weekly projections into availability-adjusted points, using getAvailablePoints.
 *
 * Only players in `players` (fantasy positions) are included; Sleeper's projections also
 * cover defensive players we never value. A player missing from a week counts as 0
 * everywhere downstream, so missing projections are simply left out.
 */
export function buildWeeklyPoints(
  players: ReadonlyMap<string, Player>,
  weeklyProjections: ReadonlyMap<number, ReadonlyMap<string, PlayerProjection>>,
  currentWeek: number,
  format: ScoringFormat
): WeeklyPoints {
  const weeklyPoints = new Map<number, Map<string, number>>();

  for (const [week, projections] of weeklyProjections) {
    const points = new Map<string, number>();
    for (const [playerId, projection] of projections) {
      const player = players.get(playerId);
      if (!player) continue;
      points.set(playerId, getAvailablePoints(player, week, currentWeek, projection, format));
    }
    weeklyPoints.set(week, points);
  }

  return weeklyPoints;
}
