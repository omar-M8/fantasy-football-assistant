import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { loadWeeklyProjections } from "@/application/use-cases/LoadWeeklyProjections";
import type { TradeEvaluation, TradeProposal } from "@/domain/entities/Trade";
import { buildWeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import { evaluateTrade } from "@/domain/services/evaluateTrade";
import { getRemainingRegularSeasonWeeks } from "@/domain/services/getRemainingRegularSeasonWeeks";

type Deps = {
  dataSource: FantasyDataSource;
};

/**
 * Evaluates a trade in a league over its remaining regular-season weeks.
 *
 * Loads everything through the data source, then hands off to the pure domain functions:
 * weeks → weekly projections → availability-adjusted points → evaluateTrade.
 *
 * @returns null when no regular-season weeks remain (nothing left to gain or lose).
 * @throws  if loading fails, or if evaluateTrade rejects the proposal.
 */
export async function analyzeTrade(
  deps: Deps,
  leagueId: string,
  proposal: TradeProposal
): Promise<TradeEvaluation | null> {
  const [league, rosters, players, nflState] = await Promise.all([
    deps.dataSource.getLeague(leagueId),
    deps.dataSource.getRosters(leagueId),
    deps.dataSource.getPlayers(),
    deps.dataSource.getNflState(),
  ]);

  const weeks = getRemainingRegularSeasonWeeks(league, nflState);
  if (weeks.length === 0) return null;

  const projections = await loadWeeklyProjections(deps, league.season, weeks);
  const weeklyPoints = buildWeeklyPoints(
    players,
    projections,
    nflState.week,
    league.settings.scoringFormat
  );

  return evaluateTrade(proposal, {
    rosterPositions: league.settings.rosterPositions,
    rosters,
    players,
    weeklyPoints,
  });
}
