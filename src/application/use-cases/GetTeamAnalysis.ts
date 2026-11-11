import type { PositionGrade } from "@/domain/entities/PositionGrade";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { loadRestOfSeasonPoints } from "@/application/use-cases/LoadRestOfSeasonPoints";
import type { Position } from "@/domain/entities/Player";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import { buildSeasonPoints } from "@/domain/services/buildSeasonPoints";
import { findUserRoster } from "@/domain/services/findUserRoster";

/** What the grades were computed from, so the page can label them. */
export type GradeBasis =
  /** Rest-of-season weekly values; grade values are points per week. */
  | { readonly kind: "rest_of_season"; readonly weeks: number }
  /** Season-long projections (no regular-season weeks left); values are season points. */
  | { readonly kind: "season" };

export type TeamAnalysis = {
  readonly rosterId: string;
  readonly teamName: string;
  readonly grades: readonly PositionGrade[];
  readonly basis: GradeBasis;
};

type Deps = {
  dataSource: FantasyDataSource;
};

const FANTASY_POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * Grades the user's team at every position against the rest of the league.
 *
 * Uses the same rest-of-season weekly points as the trade analyzer (loadRestOfSeasonPoints).
 * When no regular-season weeks remain, falls back to season-long projections, so the page
 * still has grades to show.
 *
 * @returns null if the user has no roster in the league.
 * @throws  if the league or projections fail to load.
 */
export async function getTeamAnalysis(
  deps: Deps,
  leagueId: string,
  userId: string
): Promise<TeamAnalysis | null> {
  const { league, rosters, players, weeklyPoints } = await loadRestOfSeasonPoints(deps, leagueId);

  const userRoster = findUserRoster(rosters, userId);
  if (!userRoster) return null;

  let points = weeklyPoints;
  let basis: GradeBasis;
  if (points !== null) {
    basis = { kind: "rest_of_season", weeks: points.size };
  } else {
    const seasonProjections = await deps.dataSource.getSeasonProjections(league.season);
    points = buildSeasonPoints(seasonProjections, league.settings.scoringFormat);
    basis = { kind: "season" };
  }

  const userGrades = FANTASY_POSITIONS.map((position) =>
    analyzePosition(position, league, rosters, players, points).find(
      (g) => g.rosterId === userRoster.rosterId
    )
  ).filter((g): g is PositionGrade => g !== undefined);

  return {
    rosterId: userRoster.rosterId,
    teamName: userRoster.teamName,
    grades: userGrades,
    basis,
  };
}
