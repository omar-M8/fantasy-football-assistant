import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { League } from "@/domain/entities/League";
import type { PositionGrade, Grade } from "@/domain/entities/PositionGrade";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import { computeTeamValue } from "@/domain/services/computeTeamValue";
import { getFreeAgentIds, getRosterPlayerIds } from "@/domain/services/freeAgents";

/**
 * Grades every team at one position, ranked by surplus over replacement level.
 *
 * Works week by week, on the same data and lineups as the trade engine:
 * 1. Each team's best lineup each week comes from computeTeamValue.
 * 2. Starter value that week = points of its starters at this position.
 * 3. Replacement level that week = the top N free agents at this position that week,
 *    where N = max(starters at this position that week, required slots). A team that
 *    can't fill a required slot is still measured against a free agent, so it goes negative.
 * 4. Surplus = starter value − replacement level, averaged over the weeks.
 *
 * Values in the result are per-week averages. Pass buildWeeklyPoints output for
 * rest-of-season grades, or buildSeasonPoints (a single pseudo-week) for season-long grades.
 * Grades come from rank only, so the units never change a grade.
 */
export function analyzePosition(
  position: Position,
  league: League,
  rosters: readonly Roster[],
  players: ReadonlyMap<string, Player>,
  weeklyPoints: WeeklyPoints
): readonly PositionGrade[] {
  const { rosterPositions } = league.settings;
  const weeks = [...weeklyPoints.keys()].sort((a, b) => a - b);
  const weekCount = Math.max(weeks.length, 1); // avoid dividing by zero with no weeks

  // This league's minimum starters at the position (exact slot matches, not FLEX or BN).
  const requiredCount = getRequiredStarterCount(rosterPositions, position);

  // Free agents at this position, best first, per week.
  const freeAgentsAtPosition = getFreeAgentIds(players, rosters).filter(
    (id) => players.get(id)?.position === position
  );
  const freeAgentPointsByWeek = new Map(
    weeks.map((week) => {
      const points = weeklyPoints.get(week)!;
      return [
        week,
        freeAgentsAtPosition.map((id) => points.get(id) ?? 0).sort((a, b) => b - a),
      ] as const;
    })
  );

  const scored = rosters.map((roster) => {
    const { byWeek } = computeTeamValue(
      rosterPositions,
      getRosterPlayerIds(roster),
      players,
      weeklyPoints
    );

    let starterTotal = 0;
    let starterCountTotal = 0;
    let replacementTotal = 0;
    for (const { week, lineup } of byWeek) {
      const points = weeklyPoints.get(week)!;
      const starters = lineup.filter((slot) => slot.position === position && slot.playerId);
      const replacementCount = Math.max(starters.length, requiredCount);

      starterTotal += starters.reduce((sum, slot) => sum + (points.get(slot.playerId!) ?? 0), 0);
      starterCountTotal += starters.length;
      replacementTotal += (freeAgentPointsByWeek.get(week) ?? [])
        .slice(0, replacementCount)
        .reduce((sum, pts) => sum + pts, 0);
    }

    const starterValue = starterTotal / weekCount;
    const replacementValue = replacementTotal / weekCount;
    return {
      rosterId: roster.rosterId,
      // Starts at the position can vary week to week (FLEX, byes): show the typical count.
      starterCount: Math.round(starterCountTotal / weekCount),
      starterValue,
      replacementValue,
      surplusValue: starterValue - replacementValue,
    };
  });

  const ranked = [...scored].sort((a, b) => b.surplusValue - a.surplusValue);

  return ranked.map((team, index) => {
    const rank = index + 1;
    return {
      ...team,
      position,
      grade: rankToGrade(rank, rosters.length),
      rank,
      teamCount: rosters.length,
    };
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Counts how many dedicated slots the league has for a given position.
 *
 * `rosterPositions` holds Sleeper's raw labels (e.g. "QB", "RB", "FLEX",
 * "BN"). We count exact matches, which excludes FLEX and BN. This gives
 * the *minimum* number of starters a team is expected to field at this
 * position — used as a floor when computing replacement value.
 *
 * Example:
 *   rosterPositions = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]
 *   getRequiredStarterCount(rosterPositions, "RB") → 2
 *   getRequiredStarterCount(rosterPositions, "K")  → 1
 *   getRequiredStarterCount(rosterPositions, "FLEX") → 0 (FLEX isn't a Position)
 */
function getRequiredStarterCount(rosterPositions: readonly string[], position: Position): number {
  return rosterPositions.filter((p) => p === position).length;
}

/**
 * Maps a rank (1 = best) to a letter grade using percentile bands.
 * The bands scale across league sizes — 1st of 12 and 1st of 14
 * both produce "A+".
 *
 * The `(rank - 0.5) / teamCount` formula converts a 1-indexed rank
 * into a percentile midpoint for that rank's bucket. This keeps the
 * bands balanced across even and odd team counts.
 */
function rankToGrade(rank: number, teamCount: number): Grade {
  const percentile = (rank - 0.5) / teamCount;
  if (percentile < 0.08) return "A+";
  if (percentile < 0.16) return "A";
  if (percentile < 0.25) return "A-";
  if (percentile < 0.33) return "B+";
  if (percentile < 0.42) return "B";
  if (percentile < 0.5) return "B-";
  if (percentile < 0.58) return "C+";
  if (percentile < 0.66) return "C";
  if (percentile < 0.75) return "C-";
  if (percentile < 0.83) return "D+";
  if (percentile < 0.92) return "D";
  return "F";
}
