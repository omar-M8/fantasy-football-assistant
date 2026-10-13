import type { PositionGrade } from "@/domain/entities/PositionGrade";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import type { Position } from "@/domain/entities/Player";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import { findUserRoster } from "@/domain/services/findUserRoster";

export type TeamAnalysis = {
  readonly rosterId: string;
  readonly teamName: string;
  readonly grades: readonly PositionGrade[];
};

// The dependencies for the getTeamAnalysis function.
type Deps = {
  dataSource: FantasyDataSource;
};

const FANTASY_POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * This function analyzes a user's team in a fantasy football league.
 * It fetches the league's rosters, players, and projections,
 * then computes grades for each position on the user's team.
 */
export async function getTeamAnalysis(
  deps: Deps,
  leagueId: string,
  userId: string
): Promise<TeamAnalysis | null> {
  // Fetch league, rosters, and players concurrently
  const [league, rosters, players] = await Promise.all([
    deps.dataSource.getLeague(leagueId),
    deps.dataSource.getRosters(leagueId),
    deps.dataSource.getPlayers(),
  ]);

  const projections = await deps.dataSource.getSeasonProjections(league.season); // Fetch season projections

  const userRoster = findUserRoster(rosters, userId); // Find the user's roster in the list of rosters
  if (!userRoster) return null;

  const gradesPerPosition = FANTASY_POSITIONS.map((position) =>
    // Analyze each position and compute grades
    analyzePosition(position, league, rosters, players, projections)
  );

  // Flatten the grades per position into a single array of PositionGrade objects
  const userGrades = gradesPerPosition // Filter for the user's grades
    .map((grades) => grades.find((g) => g.rosterId === userRoster.rosterId))
    .filter((g): g is PositionGrade => g !== undefined);

  // Return the team analysis result, including the user's roster ID, team name, and computed grades for each position
  return {
    rosterId: userRoster.rosterId,
    teamName: userRoster.teamName,
    grades: userGrades,
  };
}
