import { getActiveContext } from "@/lib/active-context";
import { sleeperClient } from "@/lib/sleeper-client";
import { getTeamAnalysis, type TeamAnalysis } from "@/application/use-cases/GetTeamAnalysis";
import { getDashboardData } from "@/application/use-cases/GetDashboardData";
import { Container } from "@/components/layout/Container";
import { TeamHeader } from "@/components/dashboard/TeamHeader";
import { ComparedToLeague } from "@/components/team/ComparedToLeague";
import { PositionBreakdown } from "@/components/team/PositionBreakdown";
import { describeGradeBasis } from "@/components/team/gradeBasis";
import { Card, CardContent } from "@/components/ui/card";
import type { Player, Position } from "@/domain/entities/Player";

const POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

export default async function TeamPage() {
  const { leagueId, userId } = await getActiveContext();

  const [analysis, dashboard] = await Promise.all([
    loadAnalysis(leagueId, userId),
    getDashboardData({ dataSource: sleeperClient }, leagueId, userId),
  ]);

  if (analysis === "failed") {
    return (
      <Container className="py-10">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium">We couldn&apos;t load your position grades right now.</p>
            <p className="text-muted-foreground mt-1">
              Projections didn&apos;t load from Sleeper. Please try again in a moment.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

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

  const { note, unit } = describeGradeBasis(analysis.basis);

  return (
    <Container className="space-y-8 py-10">
      <TeamHeader user={dashboard.user} roster={dashboard.roster} />
      <p className="text-muted-foreground -mb-4 text-sm">{note}</p>
      <PositionBreakdown grades={analysis.grades} playersByPosition={playersByPosition} />
      <ComparedToLeague grades={analysis.grades} unit={unit} />
    </Container>
  );
}

/** Grades need projections from Sleeper; if they fail, the page explains instead of crashing. */
async function loadAnalysis(
  leagueId: string,
  userId: string
): Promise<TeamAnalysis | null | "failed"> {
  try {
    return await getTeamAnalysis({ dataSource: sleeperClient }, leagueId, userId);
  } catch (error) {
    console.error("[team] getTeamAnalysis failed", error);
    return "failed";
  }
}
