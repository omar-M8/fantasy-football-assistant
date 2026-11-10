import { DEMO_USER_ID } from "@/config/demo";
import { getActiveLeagueId } from "@/lib/league-context";
import { sleeperClient } from "@/lib/sleeper-client";
import { buildTradePickerData } from "@/lib/trade-picker";
import { parseTradeDraft, parseTradeSearchParams } from "@/lib/trade-search-params";
import { getTradeView, type TradeView } from "@/lib/trade-view";
import { findUserRoster } from "@/domain/services/findUserRoster";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TradeBuilder } from "@/components/trade/TradeBuilder";
import { TradeMessage } from "@/components/trade/TradeMessage";
import { TradeVerdict } from "@/components/trade/TradeVerdict";
import { ValueBalance } from "@/components/trade/ValueBalance";
import { LineupDiff } from "@/components/trade/LineupDiff";
import { WeeklyImpact } from "@/components/trade/WeeklyImpact";

/**
 * /trades?partner=<rosterId>&give=<id,id>&get=<id>
 *
 * The trade lives entirely in the URL. This server component loads the league, renders the
 * builder (which only writes to the URL) and the analysis for whatever the URL describes.
 */
export default async function TradesPage(props: PageProps<"/trades">) {
  const searchParams = await props.searchParams;
  const leagueId = await getActiveLeagueId();
  const [rosters, players] = await Promise.all([
    sleeperClient.getRosters(leagueId),
    sleeperClient.getPlayers(),
  ]);

  const myRoster = findUserRoster(rosters, DEMO_USER_ID);

  return (
    <Container className="space-y-6 py-10">
      <PageHeader
        title="Trade analyzer"
        description="How a trade changes both teams over the rest of the regular season."
      />
      {myRoster ? (
        <>
          <TradeBuilder
            data={buildTradePickerData(rosters, players, myRoster.rosterId)}
            draft={parseTradeDraft(searchParams)}
          />
          <TradeResult
            view={await getTradeView(parseTradeSearchParams(searchParams), {
              dataSource: sleeperClient,
              leagueId,
              rosters,
              players,
              myRoster,
            })}
          />
        </>
      ) : (
        <TradeMessage title="You don't have a roster in this league." />
      )}
    </Container>
  );
}

function TradeResult({ view }: { view: TradeView }) {
  if (view.kind === "message") {
    return <TradeMessage title={view.title} description={view.description} />;
  }

  const list = (names: readonly string[]) => (names.length === 0 ? "nothing" : names.join(", "));
  return (
    <>
      <p className="text-muted-foreground text-sm">
        You send <span className="text-foreground">{list(view.sending)}</span> · You receive{" "}
        <span className="text-foreground">{list(view.receiving)}</span>
      </p>
      <TradeVerdict
        evaluation={view.evaluation}
        partnerName={view.partnerName}
        playerNames={view.playerNames}
      />
      <LineupDiff
        changes={view.lineupChanges}
        players={view.breakdownPlayers}
        totalWeeks={view.evaluation.weeks.length}
      />
      <ValueBalance impact={view.evaluation.teamA} />
      <WeeklyImpact rows={view.weeklyRows} players={view.breakdownPlayers} />
    </>
  );
}
