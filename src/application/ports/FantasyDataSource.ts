//Interface for the FantasyDataSource class

import type { User } from "@/domain/entities/User";
import type { Roster } from "@/domain/entities/Roster";
import type { Player } from "@/domain/entities/Player";
import { PlayerProjection } from "@/domain/entities/PlayerProjection";
import type { League } from "@/domain/entities/League";
import type { NflState } from "@/domain/entities/NflState";

/**
 * A source of fantasy football data.
 *
 * The application layer depends on this contract — not on Sleeper, ESPN,
 * or any specific implementation. Any class that satisfies this interface
 * can serve as the data source. */
export interface FantasyDataSource {
  getRosters(leagueId: string): Promise<readonly Roster[]>;
  getUsers(leagueId: string): Promise<readonly User[]>;
  getPlayers(): Promise<ReadonlyMap<string, Player>>; // Returns a map of playerId to Player object

  /**
   * Get season-long projections for every NFL player.
   * Keyed by playerId, Players without published projections are omitted.
   */
  getSeasonProjections(season: string): Promise<ReadonlyMap<string, PlayerProjection>>;

  /**
   * Get one week's projections for every NFL player.
   * Keyed by playerId. Players without projected points that week (byes,
   * injuries, unprojected players) are omitted.
   */
  getWeeklyProjections(
    season: string,
    week: number
  ): Promise<ReadonlyMap<string, PlayerProjection>>;

  /**
   * Fetches the NFL's current season and week.
   */
  getNflState(): Promise<NflState>;

  /**
   * Fetches a league's settings and metadata.
   */
  getLeague(leagueId: string): Promise<League>;
}
