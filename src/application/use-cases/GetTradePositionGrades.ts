import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { loadRestOfSeasonPoints } from "@/application/use-cases/LoadRestOfSeasonPoints";
import type { Position } from "@/domain/entities/Player";
import type { TradeEvaluation, TradeProposal } from "@/domain/entities/Trade";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import {
  getPositionGradeChanges,
  getRostersAfterTrade,
  type PositionGradeChange,
} from "@/domain/services/tradePositionGrades";

type Deps = {
  dataSource: FantasyDataSource;
};

const FANTASY_POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * How a trade moves both teams' position grades.
 *
 * Grades use the same rest-of-season weekly values as /team and the trade evaluation
 * (loadRestOfSeasonPoints). Each position is graded for the whole league before and after,
 * with both teams' after-trade rosters swapped in, so ranks reflect the trade. Kept separate
 * from analyzeTrade so that use case's result doesn't change; the weekly projections are
 * cached, so loading them again here is cheap.
 *
 * @returns only the positions whose grade or rank changes, team A first. Empty when no
 *          regular-season weeks remain (the trade page shows no analysis then anyway).
 */
export async function getTradePositionGrades(
  deps: Deps,
  leagueId: string,
  proposal: TradeProposal,
  evaluation: Pick<TradeEvaluation, "teamA" | "teamB">
): Promise<PositionGradeChange[]> {
  const { league, rosters, players, weeklyPoints } = await loadRestOfSeasonPoints(deps, leagueId);
  if (weeklyPoints === null) return [];

  const rostersAfter = getRostersAfterTrade(rosters, proposal, {
    a: evaluation.teamA,
    b: evaluation.teamB,
  });
  const gradeAll = (leagueRosters: typeof rosters) =>
    FANTASY_POSITIONS.flatMap((position) =>
      analyzePosition(position, league, leagueRosters, players, weeklyPoints)
    );

  return getPositionGradeChanges(gradeAll(rosters), gradeAll(rostersAfter), [
    proposal.teamA.rosterId,
    proposal.teamB.rosterId,
  ]);
}
