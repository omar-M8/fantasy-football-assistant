import type { NflState } from "@/domain/entities/NflState";
import type { SleeperNflStateDto } from "@/infrastructure/sleeper/dto/SleeperNflStateDto";

/**
 * Maps a SleeperNflStateDto to the NflState domain entity.
 */
export function toNflState(dto: SleeperNflStateDto): NflState {
  return {
    season: dto.season,
    week: dto.week,
    seasonType: dto.season_type,
  };
}
