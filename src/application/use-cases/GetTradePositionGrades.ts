import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import type { Position } from "@/domain/entities/Player";
import type { TradeEvaluation, TradeProposal } from "@/domain/entities/Trade";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import { buildSeasonPoints } from "@/domain/services/buildSeasonPoints";
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
 * Grades are season-long (analyzePosition with season projections, as on /team), unlike the
 * evaluation's rest-of-season weekly values. Each position is graded for the whole league
 * before and after, with both teams' after-trade rosters swapped in, so ranks reflect the
 * trade. Kept separate from analyzeTrade so that use case's result doesn't change.
 *
 * @returns only the positions whose grade or rank changes, team A first.
 */
export async function getTradePositionGrades(
  deps: Deps,
  leagueId: string,
  proposal: TradeProposal,
  evaluation: Pick<TradeEvaluation, "teamA" | "teamB">
): Promise<PositionGradeChange[]> {
  const [league, rosters, players] = await Promise.all([
    deps.dataSource.getLeague(leagueId),
    deps.dataSource.getRosters(leagueId),
    deps.dataSource.getPlayers(),
  ]);
  const projections = await deps.dataSource.getSeasonProjections(league.season);
  const seasonPoints = buildSeasonPoints(projections, league.settings.scoringFormat);

  const rostersAfter = getRostersAfterTrade(rosters, proposal, {
    a: evaluation.teamA,
    b: evaluation.teamB,
  });
  const gradeAll = (leagueRosters: typeof rosters) =>
    FANTASY_POSITIONS.flatMap((position) =>
      analyzePosition(position, league, leagueRosters, players, seasonPoints)
    );

  return getPositionGradeChanges(gradeAll(rosters), gradeAll(rostersAfter), [
    proposal.teamA.rosterId,
    proposal.teamB.rosterId,
  ]);
}
