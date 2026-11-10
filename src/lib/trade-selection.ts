import type { Player } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import { getRosterPlayerIds } from "@/domain/services/freeAgents";
import type { TradeSearchParams } from "@/lib/trade-search-params";

/**
 * Checks a trade against the actual rosters and returns a friendly, name-based message for
 * the first problem found, or null if the trade can be analyzed.
 *
 * evaluateTrade enforces the same rules, but its errors use raw IDs and "Team A". Checking
 * here first lets the page explain the problem in the user's terms, so any error the engine
 * still throws can be treated as unexpected.
 */
export function findTradeProblem(
  trade: TradeSearchParams,
  myRoster: Roster,
  partnerRoster: Roster,
  players: ReadonlyMap<string, Player>
): string | null {
  const names = (ids: readonly string[]) =>
    ids.map((id) => players.get(id)?.fullName ?? `Player ${id}`).join(", ");
  const isOrAre = (ids: readonly string[]) => (ids.length === 1 ? "is" : "are");

  if (partnerRoster.rosterId === myRoster.rosterId) {
    return "Pick a trade partner other than your own team.";
  }

  const onBothSides = trade.give.filter((id) => trade.get.includes(id));
  if (onBothSides.length > 0) {
    return `${names(onBothSides)} can't be on both sides of the trade.`;
  }

  const mine = new Set(getRosterPlayerIds(myRoster));
  const notMine = trade.give.filter((id) => !mine.has(id));
  if (notMine.length > 0) {
    return `${names(notMine)} ${isOrAre(notMine)} not on your roster.`;
  }

  const theirs = new Set(getRosterPlayerIds(partnerRoster));
  const notTheirs = trade.get.filter((id) => !theirs.has(id));
  if (notTheirs.length > 0) {
    return `${names(notTheirs)} ${isOrAre(notTheirs)} not on ${partnerRoster.teamName}'s roster.`;
  }

  return null;
}
