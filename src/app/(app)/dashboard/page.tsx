import { getActiveLeagueId } from "@/lib/league-context";
import { DEMO_USER_ID } from "@/config/demo";
import { sleeperClient } from "@/lib/sleeper-client";
import { getDashboardData } from "@/application/use-cases/GetDashboardData";
import { Container } from "@/components/layout/Container";
import { TeamHeader } from "@/components/dashboard/TeamHeader";
import { PlayerList } from "@/components/dashboard/PlayerList";

export default async function DashboardPage() {
  const leagueId = await getActiveLeagueId();
  const data = await getDashboardData({ dataSource: sleeperClient }, leagueId, DEMO_USER_ID);

  if (!data) {
    return (
      <Container className="py-10">
        <div className="...">You dont have a roster in this league.</div>
      </Container>
    );
  }

  return (
    <Container className="space-y-8 py-10">
      <TeamHeader user={data.user} roster={data.roster} />
      <PlayerList title="Starters" players={data.starters} />
      <PlayerList title="Bench" players={data.bench} />
      {data.reserve.length > 0 && <PlayerList title="Reserve / IR" players={data.reserve} />}
    </Container>
  );
}
