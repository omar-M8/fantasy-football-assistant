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

  // Free Agent pool at this position
  const freeAgentIds = getFreeAgentsAtPosition(position, allRosteredIds, players, projectedPoints);

  // Per-team starter stats
  // For each team, build their optimal lineup and calculate the starter count and starter value for the given position
  const teamStats: TeamStats[] = rosters.map((roster) => {
    const lineup = buildOptimalLineup(
      // Build the optimal lineup for this roster
      league.settings.rosterPositions,
      [...roster.starterIds, ...roster.benchIds, ...roster.reserveIds], // Combine all player IDs from the roster
      players,
      projectedPoints
    );

    // Filter the lineup to find starters at the given position
    // eg. for position "RB", find all slots in the lineup where the position is "RB" and the playerId is not null
    const startersAtPosition = lineup.filter(
      (slot) => slot.position === position && slot.playerId !== null
    );

    // Calculate the total projected points for the starters at this position
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
  // For each team, calculate the replacement value by summing the projected points of the top N free agents, where N = starterCount
  const scored = teamStats.map((team) => {
    const replacementValue = freeAgentIds // Get the top N free agents
      .slice(0, team.starterCount) // Take the top N free agents, where N = starterCount
      .reduce((sum, id) => sum + (projectedPoints.get(id) ?? 0), 0);

    // Surplus = starterValue - replacementValue
    return {
      ...team,
      replacementValue,
      surplusValue: team.starterValue - replacementValue,
    };
  });

  // Rank by surplus desc
  const ranked = [...scored].sort((a, b) => b.surplusValue - a.surplusValue);

  // Build PositionGrade[]
  // index represents the rank, starting at 0, so we add 1 to get the actual rank
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

///////////////////
//HELPERS
//////////////////

type TeamStats = {
  readonly rosterId: string;
  readonly starterCount: number;
  readonly starterValue: number;
};

function getFreeAgentsAtPosition(
  position: Position,
  allRosteredIds: ReadonlySet<string>,
  players: ReadonlyMap<string, Player>,
  projectedPoints: ReadonlyMap<string, number>
): readonly string[] {
  const freeAgentIds: string[] = [];

  for (const [playerId] of projectedPoints) {
    // Iterate over all player IDs that have projections
    if (allRosteredIds.has(playerId)) continue;
    const player = players.get(playerId);
    if (!player || player.position !== position) continue;
    freeAgentIds.push(playerId);
  }

  return freeAgentIds.sort(
    (a, b) => (projectedPoints.get(b) ?? 0) - (projectedPoints.get(a) ?? 0) // Sort free agents by projected points descending
  );
}

function rankToGrade(rank: number, teamCount: number): Grade {
  const percentile = (rank - 0.5) / teamCount; // Calculate the percentile of the rank within the total number of teams
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
