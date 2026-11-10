import type { ReactNode } from "react";

import { DEMO_USER_ID } from "@/config/demo";
import { getActiveLeagueId } from "@/lib/league-context";
import { sleeperClient } from "@/lib/sleeper-client";
import { parseTradeSearchParams, type TradeSearchParams } from "@/lib/trade-search-params";
import { findTradeProblem } from "@/lib/trade-selection";
import { analyzeTrade } from "@/application/use-cases/AnalyzeTrade";
import { findUserRoster } from "@/domain/services/findUserRoster";
import type { Player } from "@/domain/entities/Player";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TradeMessage } from "@/components/trade/TradeMessage";
import { TradeVerdict } from "@/components/trade/TradeVerdict";

/**
 * /trades?partner=<rosterId>&give=<id,id>&get=<id>
 *
 * The trade lives entirely in the URL, so this server component renders it from
 * searchParams on every request. No client state is involved.
 */
export default async function TradesPage(props: PageProps<"/trades">) {
  const parsed = parseTradeSearchParams(await props.searchParams);

  let body: ReactNode;
  if (parsed.status === "empty") {
    body = <TradeMessage title="Build a trade to analyze it" />;
  } else if (parsed.status === "invalid") {
    body = <TradeMessage title="Build a trade to analyze it" description={parsed.message} />;
  } else {
    body = await renderAnalysis(parsed.trade);
  }

  return (
    <Container className="space-y-6 py-10">
      <PageHeader
        title="Trade analyzer"
        description="How a trade changes both teams over the rest of the regular season."
      />
      {body}
    </Container>
  );
}

/** Loads the league, checks the trade, and renders the verdict or a friendly message. */
async function renderAnalysis(trade: TradeSearchParams): Promise<ReactNode> {
  const leagueId = await getActiveLeagueId();
  const [rosters, players] = await Promise.all([
    sleeperClient.getRosters(leagueId),
    sleeperClient.getPlayers(),
  ]);

  const myRoster = findUserRoster(rosters, DEMO_USER_ID);
  if (!myRoster) return <TradeMessage title="You don't have a roster in this league." />;

  const partner = rosters.find((r) => r.rosterId === trade.partner);
  if (!partner) {
    return (
      <TradeMessage
        title="That trade partner isn't in this league."
        description="Pick another team."
      />
    );
  }

  // Name-based checks first, so the engine's ID-based errors never reach the user.
  const problem = findTradeProblem(trade, myRoster, partner, players);
  if (problem) return <TradeMessage title="This trade can't be analyzed" description={problem} />;

  let evaluation;
  try {
    evaluation = await analyzeTrade({ dataSource: sleeperClient }, leagueId, {
      teamA: { rosterId: myRoster.rosterId, gives: trade.give },
      teamB: { rosterId: partner.rosterId, gives: trade.get },
    });
  } catch (error) {
    // The selection was already validated, so this is unexpected (e.g. Sleeper is down).
    console.error("[trades] analyzeTrade failed", error);
    return (
      <TradeMessage
        title="We couldn't analyze this trade right now"
        description="Please try again in a moment."
      />
    );
  }

  if (evaluation === null) {
    return (
      <TradeMessage
        title="No regular-season weeks left"
        description="Trades are valued over the remaining regular season, and it's over."
      />
    );
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        You send <span className="text-foreground">{playerNames(trade.give, players)}</span> · You
        receive <span className="text-foreground">{playerNames(trade.get, players)}</span>
      </p>
      <TradeVerdict evaluation={evaluation} partnerName={partner.teamName} />
    </>
  );
}

function playerNames(ids: readonly string[], players: ReadonlyMap<string, Player>): string {
  return ids.length === 0 ? "nothing" : ids.map((id) => players.get(id)?.fullName ?? id).join(", ");
}
