import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import type { Roster } from "@/domain/entities/Roster";
import type { User } from "@/domain/entities/User";
import type { Player } from "@/domain/entities/Player";
import { findUserRoster } from "@/domain/services/findUserRoster";

export type DashboardData = {
  user: User;
  roster: Roster;
  starters: Player[];
  bench: Player[];
  reserve: Player[];
};

// This is a port to the application layer,
// so it doesn't know about Sleeper or any other specific data source
type Deps = {
  dataSource: FantasyDataSource; // This port is where we can swap out the data source implementation
};

/**
 * Loads everything the dashboard page needs for a given user's team.
 * Returns null if the user doesn't own a roster in this league.
 */
export async function getDashboardData(
  deps: Deps,
  leagueId: string,
  userId: string
): Promise<DashboardData | null> {
  const [rosters, users, playerMap] = await Promise.all([
    deps.dataSource.getRosters(leagueId),
    deps.dataSource.getUsers(leagueId),
    deps.dataSource.getPlayers(),
  ]);

  const roster = findUserRoster(rosters, userId);
  if (!roster) return null;

  const user = users.find((u) => u.userId === userId);
  if (!user) return null;

  const resolve = (ids: readonly string[]): Player[] =>
    ids.map((id) => playerMap.get(id)).filter((p): p is Player => p !== undefined);

  return {
    user,
    roster,
    starters: resolve(roster.starterIds),
    bench: resolve(roster.benchIds),
    reserve: resolve(roster.reserveIds),
  };
}
