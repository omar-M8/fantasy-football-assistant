import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { loadRestOfSeasonPoints } from "@/application/use-cases/LoadRestOfSeasonPoints";
import type { TradeEvaluation, TradeProposal } from "@/domain/entities/Trade";
import { evaluateTrade } from "@/domain/services/evaluateTrade";

type Deps = {
  dataSource: FantasyDataSource;
};

/**
 * Evaluates a trade in a league over its remaining regular-season weeks.
 *
 * Loads the league and its rest-of-season weekly points (loadRestOfSeasonPoints, shared with
 * getTeamAnalysis), then hands off to the pure domain function evaluateTrade.
 *
 * @returns null when no regular-season weeks remain (nothing left to gain or lose).
 * @throws  if loading fails, or if evaluateTrade rejects the proposal.
 */
export async function analyzeTrade(
  deps: Deps,
  leagueId: string,
  proposal: TradeProposal
): Promise<TradeEvaluation | null> {
  const { league, rosters, players, weeklyPoints } = await loadRestOfSeasonPoints(deps, leagueId);
  if (weeklyPoints === null) return null;

  return evaluateTrade(proposal, {
    rosterPositions: league.settings.rosterPositions,
    rosters,
    players,
    weeklyPoints,
  });
}
