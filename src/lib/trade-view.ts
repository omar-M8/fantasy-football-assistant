import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { analyzeTrade } from "@/application/use-cases/AnalyzeTrade";
import type { Player } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { TradeEvaluation, TradeReason } from "@/domain/entities/Trade";
import { getReasonPlayerIds } from "@/components/trade/formatTradeReason";
import type { ParsedTradeSearchParams } from "@/lib/trade-search-params";
import { findTradeProblem } from "@/lib/trade-selection";

/** What the /trades page shows under the builder. */
export type TradeView =
  | { readonly kind: "message"; readonly title: string; readonly description?: string }
  | {
      readonly kind: "analysis";
      readonly evaluation: TradeEvaluation;
      readonly partnerName: string;
      /** Names for the players the reasons mention. */
      readonly playerNames: Readonly<Record<string, string>>;
      /** Display names of what the user sends and receives. */
      readonly sending: readonly string[];
      readonly receiving: readonly string[];
    };

export type TradeViewContext = {
  readonly dataSource: FantasyDataSource;
  readonly leagueId: string;
  readonly rosters: readonly Roster[];
  readonly players: ReadonlyMap<string, Player>;
  readonly myRoster: Roster;
};

const BUILD_PROMPT = "Build a trade to analyze it";

/**
 * Decides what the /trades page shows for the parsed URL: a friendly message, or the
 * analysis. Kept out of page.tsx so it can be unit tested (page files can't export helpers).
 */
export async function getTradeView(
  parsed: ParsedTradeSearchParams,
  { dataSource, leagueId, rosters, players, myRoster }: TradeViewContext
): Promise<TradeView> {
  if (parsed.status === "empty") return message(BUILD_PROMPT);
  if (parsed.status === "invalid") return message(BUILD_PROMPT, parsed.message);
  const trade = parsed.trade;

  const partner = rosters.find((r) => r.rosterId === trade.partner);
  if (!partner) return message("That trade partner isn't in this league.", "Pick another team.");

  // Name-based checks first, so the engine's ID-based errors never reach the user.
  const problem = findTradeProblem(trade, myRoster, partner, players);
  if (problem) return message("This trade can't be analyzed", problem);

  let evaluation: TradeEvaluation | null;
  try {
    evaluation = await analyzeTrade({ dataSource }, leagueId, {
      teamA: { rosterId: myRoster.rosterId, gives: trade.give },
      teamB: { rosterId: partner.rosterId, gives: trade.get },
    });
  } catch (error) {
    // The selection was already validated, so this is unexpected (e.g. Sleeper is down).
    console.error("[trades] analyzeTrade failed", error);
    return message("We couldn't analyze this trade right now", "Please try again in a moment.");
  }

  if (evaluation === null) {
    return message(
      "No regular-season weeks left",
      "Trades are valued over the remaining regular season, and it's over."
    );
  }

  const nameOf = (id: string) => players.get(id)?.fullName ?? id;
  return {
    kind: "analysis",
    evaluation,
    partnerName: partner.teamName,
    playerNames: namesFor(evaluation.reasons, nameOf),
    sending: trade.give.map(nameOf),
    receiving: trade.get.map(nameOf),
  };
}

function message(title: string, description?: string): TradeView {
  return description === undefined
    ? { kind: "message", title }
    : { kind: "message", title, description };
}

function namesFor(
  reasons: readonly TradeReason[],
  nameOf: (id: string) => string
): Record<string, string> {
  return Object.fromEntries(getReasonPlayerIds(reasons).map((id) => [id, nameOf(id)]));
}
