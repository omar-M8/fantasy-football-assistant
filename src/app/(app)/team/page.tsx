import { getActiveLeagueId } from "@/lib/league-context";
import { DEMO_USER_ID } from "@/config/demo";
import { sleeperClient } from "@/lib/sleeper-client";
import { getTeamAnalysis } from "@/application/use-cases/GetTeamAnalysis";
import { getDashboardData } from "@/application/use-cases/GetDashboardData";
import { Container } from "@/components/layout/Container";
import { TeamHeader } from "@/components/dashboard/TeamHeader";
import { ComparedToLeague } from "@/components/team/ComparedToLeague";
import { PositionBreakdown } from "@/components/team/PositionBreakdown";
import type { Player, Position } from "@/domain/entities/Player";

const POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

export default async function TeamPage() {
  const leagueId = await getActiveLeagueId();

  const [analysis, dashboard] = await Promise.all([
    getTeamAnalysis({ dataSource: sleeperClient }, leagueId, DEMO_USER_ID),
    getDashboardData({ dataSource: sleeperClient }, leagueId, DEMO_USER_ID),
  ]);

  if (!analysis || !dashboard) {
    return (
      <Container className="py-10">
        <div className="text-muted-foreground">No team found in this league.</div>
      </Container>
    );
  }

  const allPlayers: Player[] = [...dashboard.starters, ...dashboard.bench, ...dashboard.reserve];

  const playersByPosition = new Map<Position, readonly Player[]>();
  for (const position of POSITIONS) {
    playersByPosition.set(
      position,
      allPlayers.filter((p) => p.position === position)
    );
  }

  return (
    <Container className="space-y-8 py-10">
      <TeamHeader user={dashboard.user} roster={dashboard.roster} />
      <PositionBreakdown grades={analysis.grades} playersByPosition={playersByPosition} />
      <ComparedToLeague grades={analysis.grades} />
    </Container>
  );
}
