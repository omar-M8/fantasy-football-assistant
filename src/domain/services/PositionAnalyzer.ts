import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { League } from "@/domain/entities/League";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import type { PositionGrade, Grade } from "@/domain/entities/PositionGrade";
import { getProjectedPoints } from "@/domain/entities/PlayerProjection";
import { buildOptimalLineup } from "@/domain/services/BuildOptimalLineup";

export function analyzePosition(
  position: Position,
  league: League,
  rosters: readonly Roster[],
  players: ReadonlyMap<string, Player>,
  projections: ReadonlyMap<string, PlayerProjection>
): readonly PositionGrade[] {
  // Convert projections → scoring-agnostic points map
  const projectedPoints = new Map<string, number>();
  for (const [playerId, projection] of projections) {
    projectedPoints.set(playerId, getProjectedPoints(projection, league.settings.scoringFormat));
  }

  // All rostered player IDs across all teams
  const allRosteredIds = new Set(
    rosters.flatMap((r) => [...r.starterIds, ...r.benchIds, ...r.reserveIds])
  );

  // Free agent pool at this position, sorted by projection desc
  const freeAgentIds = getFreeAgentsAtPosition(position, allRosteredIds, players, projectedPoints);

  // How many dedicated slots the league requires at this position.
  // This is the minimum a team is expected to start — a team that
  // fails to fill these slots (e.g. no kicker) should be penalized.
  const requiredCount = getRequiredStarterCount(league.settings.rosterPositions, position);

  // Per-team starter stats
  const teamStats: TeamStats[] = rosters.map((roster) => {
    const lineup = buildOptimalLineup(
      league.settings.rosterPositions,
      [...roster.starterIds, ...roster.benchIds, ...roster.reserveIds],
      players,
      projectedPoints
    );

    const startersAtPosition = lineup.filter(
      (slot) => slot.position === position && slot.playerId !== null
    );

    const starterValue = startersAtPosition.reduce(
      (sum, slot) => sum + (projectedPoints.get(slot.playerId!) ?? 0),
      0
    );

    return {
      rosterId: roster.rosterId,
      starterCount: startersAtPosition.length,
      starterValue,
    };
  });

  // Replacement value + surplus per team
  const scored = teamStats.map((team) => {
    // A team's replacement ladder is the top-N free agents, where
    // N is the larger of:
    //   - their actual starter count (varies due to FLEX usage)
    //   - the league's required count at this position
    //
    // Using the max handles the "no kicker" case: a team starting 0
    // kickers should still subtract the top-1 free agent kicker, so
    // their surplus is negative (0 − 106 = −106) rather than 0.
    const replacementCount = Math.max(team.starterCount, requiredCount);

    const replacementValue = freeAgentIds
      .slice(0, replacementCount)
      .reduce((sum, id) => sum + (projectedPoints.get(id) ?? 0), 0);

    return {
      ...team,
      replacementValue,
      surplusValue: team.starterValue - replacementValue,
    };
  });

  // Rank by surplus desc
  const ranked = [...scored].sort((a, b) => b.surplusValue - a.surplusValue);

  // Build PositionGrade[]
  return ranked.map((team, index) => {
    const rank = index + 1;
    return {
      rosterId: team.rosterId,
      position,
      grade: rankToGrade(rank, rosters.length),
      rank,
      teamCount: rosters.length,
      starterCount: team.starterCount,
      starterValue: team.starterValue,
      replacementValue: team.replacementValue,
      surplusValue: team.surplusValue,
    };
  });
}

// ============================================================================
// Helpers
// ============================================================================

type TeamStats = {
  readonly rosterId: string;
  readonly starterCount: number;
  readonly starterValue: number;
};

/**
 * Returns the IDs of all players at `position` who:
 *   1. Have a projection (so we can compare their value)
 *   2. Are not rostered anywhere in the league
 *   3. Actually play the given position
 *
 * Sorted by projected points descending, so callers can slice the
 * top N to form a replacement ladder.
 *
 * Used to compute the "replacement level" — the value a team could
 * get by picking up the best available free agents at this position.
 */
function getFreeAgentsAtPosition(
  position: Position,
  allRosteredIds: ReadonlySet<string>,
  players: ReadonlyMap<string, Player>,
  projectedPoints: ReadonlyMap<string, number>
): readonly string[] {
  const freeAgentIds: string[] = [];

  for (const [playerId] of projectedPoints) {
    if (allRosteredIds.has(playerId)) continue;
    const player = players.get(playerId);
    if (!player || player.position !== position) continue;
    freeAgentIds.push(playerId);
  }

  return freeAgentIds.sort((a, b) => (projectedPoints.get(b) ?? 0) - (projectedPoints.get(a) ?? 0));
}

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
