import type { Player } from "@/domain/entities/Player";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import { computeTeamValue } from "@/domain/services/computeTeamValue";

export type RosterSizeInput = {
  readonly rosterPositions: readonly string[];
  /** The roster after the trade: starters, bench, and reserve. */
  readonly playerIds: readonly string[];
  /** Reserve/IR players. They're valued, but don't count toward the roster limit. */
  readonly reserveIds: ReadonlySet<string>;
  /** Fill open spots up to this many non-reserve players (the pre-trade count). */
  readonly fillTo: number;
  /** Free agents that may be added, best first. */
  readonly candidateIds: readonly string[];
  readonly players: ReadonlyMap<string, Player>;
  readonly weeklyPoints: WeeklyPoints;
};

export type RosterSizeResult = {
  readonly playerIds: readonly string[];
  readonly added: readonly string[];
  readonly dropped: readonly string[];
};

/**
 * Brings a post-trade roster back to a legal, comparable size.
 *
 * - Over the limit (more non-reserve players than `rosterPositions` has slots): repeatedly
 *   drop the player whose removal costs the least team value.
 * - Spots opened by the trade (fewer than `fillTo`): repeatedly add the free agent who raises
 *   team value the most. Choosing by added value means the "weakest position" is filled
 *   automatically, respecting the league's slot and flex rules.
 *
 * Only trade-created spots are filled, so a team that already had an open spot before the
 * trade isn't credited with a free agent it could have added anyway.
 */
export function adjustRosterSize(input: RosterSizeInput): RosterSizeResult {
  const { rosterPositions, reserveIds, players, weeklyPoints } = input;
  const limit = rosterPositions.length;
  const fillTo = Math.min(input.fillTo, limit);

  const valueOf = (ids: readonly string[]) =>
    computeTeamValue(rosterPositions, ids, players, weeklyPoints).total;
  const activeCount = (ids: readonly string[]) => ids.filter((id) => !reserveIds.has(id)).length;

  let ids = [...input.playerIds];
  const added: string[] = [];
  const dropped: string[] = [];

  // Over the limit: drop whoever the team misses least.
  while (activeCount(ids) > limit) {
    const droppable = ids.filter((id) => !reserveIds.has(id));
    const leastMissed = minBy(droppable, (id) => -valueOf(ids.filter((x) => x !== id)));
    ids = ids.filter((id) => id !== leastMissed);
    dropped.push(leastMissed);
  }

  // Open spots: add whichever free agent helps most.
  let candidates = input.candidateIds.filter((id) => !ids.includes(id));
  while (activeCount(ids) < fillTo && candidates.length > 0) {
    const mostHelpful = minBy(candidates, (id) => -valueOf([...ids, id]));
    ids = [...ids, mostHelpful];
    added.push(mostHelpful);
    candidates = candidates.filter((id) => id !== mostHelpful);
  }

  return { playerIds: ids, added, dropped };
}

/** The item with the lowest score. Ties keep the earliest item, so results are deterministic. */
function minBy<T>(items: readonly T[], score: (item: T) => number): T {
  let best = items[0];
  let bestScore = score(best);
  for (const item of items.slice(1)) {
    const s = score(item);
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}
