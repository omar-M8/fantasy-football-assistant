import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import type { SleeperPlayerProjectionDto } from "@/infrastructure/sleeper/dto/SleeperProjectionDto";

/**
 * Maps a Sleeper projection DTO to a PlayerProjection domain entity.
 *
 * Returns null if the DTO contains no projected points. Sleeper
 * publishes empty stats for ~85% of players (backups, rookies,
 * defensive players) — those are filtered out upstream.
 *
 * `pts_half_ppr` and `pts_std` fall back to `pts_ppr` when missing.
 * For QBs, all three formats are usually identical (no receptions
 * → no PPR difference), so Sleeper only publishes `pts_ppr`.
 */
export function toPlayerProjection(dto: SleeperPlayerProjectionDto): PlayerProjection | null {
  const stats = dto.stats;
  if (!stats || stats.pts_ppr === undefined) return null;

  return {
    playerId: dto.player_id,
    pointsPpr: stats.pts_ppr,
    pointsHalfPpr: stats.pts_half_ppr ?? stats.pts_ppr,
    pointsStd: stats.pts_std ?? stats.pts_ppr,
  };
}
