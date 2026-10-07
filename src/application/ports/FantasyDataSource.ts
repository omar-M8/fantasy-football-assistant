//Interface for the FantasyDataSource class

import type { User } from "@/domain/entities/User";
import type { Roster } from "@/domain/entities/Roster";
import type { Player } from "@/domain/entities/Player";
import { PlayerProjection } from "@/domain/entities/PlayerProjection";

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
}
