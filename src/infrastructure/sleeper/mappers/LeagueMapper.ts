import type { League, ScoringFormat } from "@/domain/entities/League";
import type { SleeperLeagueDto } from "@/infrastructure/sleeper/dto/SleeperLeagueDto";

/**
 * Maps Sleeper's receptions scoring value to the domain's
 * ScoringFormat union. Uses thresholds so any number near 0,
 * 0.5, or 1 maps correctly.
 */
function toScoringFormat(rec: number): ScoringFormat {
  if (rec >= 1) return "ppr";
  if (rec >= 0.5) return "half_ppr";
  return "standard";
}

/**
 * Maps a SleeperLeagueDto to the League domain entity.
 */
export function toLeague(dto: SleeperLeagueDto): League {
  return {
    leagueId: dto.league_id,
    name: dto.name,
    season: dto.season,
    currentWeek: dto.settings?.leg ?? 0,
    teamCount: dto.total_rosters,
    settings: {
      scoringFormat: toScoringFormat(dto.scoring_settings?.rec ?? 0), // default to standard if missing
      rosterPositions: dto.roster_positions,
    },
  };
}
