import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";

/** Sleeper fills empty starter slots with "0". It's never a real player. */
export const EMPTY_SLOT_ID = "0";

/** Every real player ID on a roster: starters, bench, and reserve, without duplicates. */
export function getRosterPlayerIds(roster: Roster): string[] {
  const ids = [...roster.starterIds, ...roster.benchIds, ...roster.reserveIds];
  return [...new Set(ids)].filter((id) => id !== EMPTY_SLOT_ID);
}

/** Players in `players` who aren't on any roster in the league. */
export function getFreeAgentIds(
  players: ReadonlyMap<string, Player>,
  rosters: readonly Roster[]
): string[] {
  const rostered = new Set(rosters.flatMap(getRosterPlayerIds));
  return [...players.keys()].filter((id) => !rostered.has(id));
}

/** A player's points summed over every week in `weeklyPoints`. */
export function getTotalPoints(playerId: string, weeklyPoints: WeeklyPoints): number {
  let total = 0;
  for (const points of weeklyPoints.values()) total += points.get(playerId) ?? 0;
  return total;
}

/**
 * The best `perPosition` free agents at each position by remaining points: the candidates
 * worth trying when a trade opens a roster spot. Free agents with no remaining points are skipped.
 */
export function getTopFreeAgents(
  freeAgentIds: readonly string[],
  players: ReadonlyMap<string, Player>,
  weeklyPoints: WeeklyPoints,
  perPosition: number
): string[] {
  const byPosition = new Map<Position, { id: string; total: number }[]>();

  for (const id of freeAgentIds) {
    const position = players.get(id)?.position;
    const total = getTotalPoints(id, weeklyPoints);
    if (!position || total <= 0) continue;
    byPosition.set(position, [...(byPosition.get(position) ?? []), { id, total }]);
  }

  return [...byPosition.values()].flatMap((candidates) =>
    candidates
      .sort((a, b) => b.total - a.total)
      .slice(0, perPosition)
      .map((c) => c.id)
  );
}
