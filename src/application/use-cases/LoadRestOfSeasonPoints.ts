import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { loadWeeklyProjections } from "@/application/use-cases/LoadWeeklyProjections";
import type { League } from "@/domain/entities/League";
import type { NflState } from "@/domain/entities/NflState";
import type { Player } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import { buildWeeklyPoints, type WeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import { getRemainingRegularSeasonWeeks } from "@/domain/services/getRemainingRegularSeasonWeeks";

type Deps = {
  dataSource: FantasyDataSource;
};

export type RestOfSeasonData = {
  readonly league: League;
  readonly rosters: readonly Roster[];
  readonly players: ReadonlyMap<string, Player>;
  readonly nflState: NflState;
  /** Availability-adjusted points per remaining week, or null when no regular-season weeks remain. */
  readonly weeklyPoints: WeeklyPoints | null;
};

/**
 * Loads a league and its rest-of-season weekly points: remaining weeks → weekly projections →
 * availability-adjusted points in the league's scoring format. Shared by analyzeTrade and
 * getTeamAnalysis so trades and position grades use the same numbers.
 *
 * Doesn't load projections when no weeks remain.
 * @throws if anything fails to load (see loadWeeklyProjections).
 */
export async function loadRestOfSeasonPoints(
  deps: Deps,
  leagueId: string
): Promise<RestOfSeasonData> {
  const [league, rosters, players, nflState] = await Promise.all([
    deps.dataSource.getLeague(leagueId),
    deps.dataSource.getRosters(leagueId),
    deps.dataSource.getPlayers(),
    deps.dataSource.getNflState(),
  ]);

  const weeks = getRemainingRegularSeasonWeeks(league, nflState);
  if (weeks.length === 0) return { league, rosters, players, nflState, weeklyPoints: null };

  const projections = await loadWeeklyProjections(deps, league.season, weeks);
  const weeklyPoints = buildWeeklyPoints(
    players,
    projections,
    nflState.week,
    league.settings.scoringFormat
  );
  return { league, rosters, players, nflState, weeklyPoints };
}
