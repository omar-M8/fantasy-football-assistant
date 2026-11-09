import type { ScoringFormat } from "@/domain/entities/League";
import type { InjuryStatus, Player } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { getProjectedPoints } from "@/domain/entities/PlayerProjection";

/**
 * Injury statuses that mean a player won't play at all. Questionable and Doubtful are
 * deliberately left out: those players often do play, so for v1 we trust their projection.
 *
 * Uses an array + `includes`, the same pattern as FANTASY_POSITIONS in Player.ts.
 */
const SIDELINED_STATUSES: readonly InjuryStatus[] = ["Out", "IR", "PUP", "Sus"];

/**
 * How many fantasy points to expect from one player in one week, after accounting for
 * whether they'll actually be available to play.
 *
 * This is the weekly, availability-aware version of the projection → points step that
 * PositionAnalyzer does for the whole season. Callers run it once per player per week
 * to build the points map that `buildOptimalLineup` consumes.
 *
 * Rules, checked in this order:
 *   1. No projection for that week → 0.
 *      Sleeper omits players with no projected points instead of sending 0, so this
 *      covers byes, injuries Sleeper already accounts for, and unprojected players.
 *   2. Sidelined (Out / IR / PUP / Sus) and `week` is the current week → 0.
 *      `injuryStatus` describes the player *right now*, so it only tells us about the
 *      current week. For later weeks we trust the weekly projection, which already
 *      reflects expected return dates (e.g. a player on IR projected again in week 14).
 *   3. Otherwise → the projection for the league's scoring format.
 *      Questionable and Doubtful players land here (see SIDELINED_STATUSES).
 *
 * How `week` relates to `currentWeek` (only the middle case is special):
 *   - past week (week < currentWeek)    → rules 1 and 3 only
 *   - current week (week === currentWeek) → all three rules
 *   - future week (week > currentWeek)  → rules 1 and 3 only
 *
 * Note: trade analysis never passes the current week (see getRemainingRegularSeasonWeeks),
 * so rule 2 doesn't affect trade values today. It stays so the function is correct for any
 * caller, e.g. a future "who should I start this week?" feature.
 *
 * @param player      The player being valued. Only `injuryStatus` is read.
 * @param week        The week being valued.
 * @param currentWeek The NFL's current week (from NflState).
 * @param projection  That week's projection for this player, or `undefined` if Sleeper has
 *                    none. Required rather than optional (`?`) so callers can't forget to
 *                    look it up: they must pass `projections.get(playerId)` explicitly.
 * @param format      The league's scoring format.
 * @returns Expected points; never negative, and 0 when the player isn't expected to play.
 */
export function getAvailablePoints(
  player: Player,
  week: number,
  currentWeek: number,
  projection: PlayerProjection | undefined,
  format: ScoringFormat
): number {
  // Rule 1: nothing projected for this week (bye, injury, or unprojected player).
  if (projection === undefined) return 0;

  // Rule 2: sidelined players score nothing this week. Later weeks trust the projection.
  if (week === currentWeek && isSidelined(player.injuryStatus)) return 0;

  // Rule 3: the projection for this league's scoring format.
  return getProjectedPoints(projection, format);
}

/**
 * True when the status means the player won't play.
 *
 * `null` means no reported injury. Statuses Sleeper sends that aren't in the
 * InjuryStatus union ("NA", "COV", "DNR") aren't in SIDELINED_STATUSES either, so they
 * count as available. See the TODO on InjuryStatus in Player.ts.
 */
function isSidelined(status: InjuryStatus | null): boolean {
  return status !== null && SIDELINED_STATUSES.includes(status);
}
