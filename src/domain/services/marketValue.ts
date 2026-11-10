import type { Player, Position } from "@/domain/entities/Player";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";

/** position → (week → points of the best free agent at that position that week). */
export type ReplacementPoints = ReadonlyMap<Position, ReadonlyMap<number, number>>;

/**
 * Replacement level, week by week: what any team could get for free at each position.
 * Same idea as PositionAnalyzer's replacement value (best free agents), but weekly.
 */
export function getReplacementPoints(
  freeAgentIds: readonly string[],
  players: ReadonlyMap<string, Player>,
  weeklyPoints: WeeklyPoints
): ReplacementPoints {
  const replacement = new Map<Position, Map<number, number>>();

  for (const [week, points] of weeklyPoints) {
    for (const id of freeAgentIds) {
      const position = players.get(id)?.position;
      if (!position) continue;
      const byWeek = replacement.get(position) ?? new Map<number, number>();
      byWeek.set(week, Math.max(byWeek.get(week) ?? 0, points.get(id) ?? 0));
      replacement.set(position, byWeek);
    }
  }

  return replacement;
}

/**
 * A player's roster-blind value: points above replacement, summed over the remaining weeks.
 *
 *   Σ max(0, playerPoints[w] − replacementPoints[position][w])
 *
 * A week below replacement counts as 0, not negative, because a team would simply start the
 * free agent instead. Byes and injuries therefore cost value without going below zero.
 */
export function getMarketValue(
  playerId: string,
  players: ReadonlyMap<string, Player>,
  weeklyPoints: WeeklyPoints,
  replacement: ReplacementPoints
): number {
  const position = players.get(playerId)?.position;
  if (!position) return 0;

  let value = 0;
  for (const [week, points] of weeklyPoints) {
    const aboveReplacement =
      (points.get(playerId) ?? 0) - (replacement.get(position)?.get(week) ?? 0);
    value += Math.max(0, aboveReplacement);
  }
  return value;
}
