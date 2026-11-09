import type { Player } from "@/domain/entities/Player";
import type { TeamValue, WeeklyTeamValue } from "@/domain/entities/TeamValue";
import { buildOptimalLineup } from "@/domain/services/BuildOptimalLineup";

/**
 * Values a roster by starting its best lineup in every given week and adding up the points.
 *
 * Why weekly instead of one season-long lineup: a single lineup gives bench players ~0
 * value. Re-picking the lineup each week lets a backup earn points when a starter is on bye
 * or hurt, and stops a sidelined player from being "started" on reputation.
 *
 * @param rosterPositions The league's slot labels (e.g. ["QB", "RB", "FLEX", "BN"]).
 * @param playerIds       Everyone on the roster: starters, bench, and reserve.
 * @param players         Player details, used to check which slots each player can fill.
 * @param weeklyPoints    week → (playerId → points). Build each inner map with
 *                        `getAvailablePoints`. A player missing from a week counts as 0,
 *                        which is how byes and injuries show up.
 */
export function computeTeamValue(
  rosterPositions: readonly string[],
  playerIds: readonly string[],
  players: ReadonlyMap<string, Player>,
  weeklyPoints: ReadonlyMap<number, ReadonlyMap<string, number>>
): TeamValue {
  // Sort so `byWeek` is in week order no matter how the map was built.
  const weeks = [...weeklyPoints.keys()].sort((a, b) => a - b);

  const byWeek: WeeklyTeamValue[] = weeks.map((week) => {
    const points = weeklyPoints.get(week)!; // safe: `week` came from this map's keys

    const lineup = buildOptimalLineup(rosterPositions, playerIds, players, points);

    // Only starters score. Empty slots (playerId null) add nothing.
    const weekTotal = lineup.reduce(
      (sum, slot) => sum + (slot.playerId === null ? 0 : (points.get(slot.playerId) ?? 0)),
      0
    );

    return { week, points: weekTotal, lineup };
  });

  const total = byWeek.reduce((sum, w) => sum + w.points, 0);

  return { total, byWeek };
}
