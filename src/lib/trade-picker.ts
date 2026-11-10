import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import { getRosterPlayerIds } from "@/domain/services/freeAgents";
import type { TradeDraft } from "@/lib/trade-search-params";

/** Just what the trade builder shows for a player. Small and serializable for the client. */
export type PickerPlayer = {
  readonly id: string;
  readonly name: string;
  readonly position: Position;
  /** NFL team code, or null for free agents. */
  readonly nflTeam: string | null;
};

export type PickerTeam = {
  readonly rosterId: string;
  readonly teamName: string;
  readonly players: readonly PickerPlayer[];
};

export type TradePickerData = {
  readonly me: PickerTeam;
  /** Every other team in the league, in roster order. */
  readonly partners: readonly PickerTeam[];
};

const POSITION_ORDER: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/** The builder's teams and players, sorted by position then name. Unknown IDs are skipped. */
export function buildTradePickerData(
  rosters: readonly Roster[],
  players: ReadonlyMap<string, Player>,
  myRosterId: string
): TradePickerData {
  const toTeam = (roster: Roster): PickerTeam => ({
    rosterId: roster.rosterId,
    teamName: roster.teamName,
    players: getRosterPlayerIds(roster)
      .flatMap((id) => {
        const player = players.get(id);
        return player
          ? [{ id, name: player.fullName, position: player.position, nflTeam: player.team }]
          : [];
      })
      .sort(
        (x, y) =>
          POSITION_ORDER.indexOf(x.position) - POSITION_ORDER.indexOf(y.position) ||
          x.name.localeCompare(y.name)
      ),
  });

  const mine = rosters.find((r) => r.rosterId === myRosterId);
  if (!mine) throw new Error(`Roster ${myRosterId} is not in this league`);

  return {
    me: toTeam(mine),
    partners: rosters.filter((r) => r.rosterId !== myRosterId).map(toTeam),
  };
}

/**
 * The /trades URL for a draft: "/trades?partner=3&give=1,2&get=9". Empty parts are left out,
 * and an empty draft is plain "/trades". IDs are encoded, but commas stay readable.
 */
export function buildTradeHref(draft: TradeDraft): string {
  const list = (ids: readonly string[]) => ids.map(encodeURIComponent).join(",");
  const parts = [
    draft.partner !== null && `partner=${encodeURIComponent(draft.partner)}`,
    draft.give.length > 0 && `give=${list(draft.give)}`,
    draft.get.length > 0 && `get=${list(draft.get)}`,
  ].filter(Boolean);
  return parts.length === 0 ? "/trades" : `/trades?${parts.join("&")}`;
}

/** Adds the ID if it's missing, removes it if present. Keeps the original order. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
