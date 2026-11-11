import Link from "next/link";

import { backToDemo, selectTeam } from "@/app/actions/league";
import { getChosenLeagueId, getChosenUserId } from "@/lib/active-context";
import { sleeperClient } from "@/lib/sleeper-client";
import { buildTeamChoices, type TeamChoice } from "@/lib/team-choices";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeagueIdForm } from "@/components/league/LeagueIdForm";
import { UserAvatar } from "@/components/league/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ERRORS: Record<string, string> = {
  team: "That team isn't in this league. Pick one from the list.",
  unavailable: "We couldn't reach Sleeper just now. Please try again in a moment.",
};

/**
 * Lists every team in the chosen league. Picking one remembers it (selectTeam) and opens
 * the dashboard. Lives outside the (app) group, whose layout redirects here until a team
 * is picked.
 */
export default async function SelectTeamPage(props: PageProps<"/select-team">) {
  const { error } = await props.searchParams;
  const leagueId = await getChosenLeagueId();

  if (!leagueId) {
    return (
      <Container className="py-10">
        <PageHeader title="Pick your team" description="Enter your Sleeper league ID first." />
        <Card>
          <CardContent className="flex justify-center py-8">
            <LeagueIdForm />
          </CardContent>
        </Card>
      </Container>
    );
  }

  let leagueName: string;
  let teams: TeamChoice[];
  try {
    const [league, rosters, users] = await Promise.all([
      sleeperClient.getLeague(leagueId),
      sleeperClient.getRosters(leagueId),
      sleeperClient.getUsers(leagueId),
    ]);
    leagueName = league.name;
    teams = buildTeamChoices(rosters, users);
  } catch (loadError) {
    console.error("[select-team] loading the league failed", loadError);
    return (
      <Container className="py-10">
        <PageHeader title="Pick your team" />
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="font-medium">We couldn&apos;t load this league right now.</p>
            <p className="text-muted-foreground">Please try again in a moment.</p>
            <LeaveLeagueControls />
          </CardContent>
        </Card>
      </Container>
    );
  }

  const currentUserId = await getChosenUserId();
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <Container className="py-10">
      <PageHeader title="Pick your team" description={`Which team is yours in ${leagueName}?`} />

      {errorMessage && (
        <p role="alert" className="text-destructive mb-4 text-sm">
          {errorMessage}
        </p>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium">This league has no teams with owners yet.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.userId}>
              <TeamButton team={team} isCurrent={team.userId === currentUserId} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <LeaveLeagueControls />
      </div>
    </Container>
  );
}

function TeamButton({ team, isCurrent }: { team: TeamChoice; isCurrent: boolean }) {
  return (
    <form action={selectTeam}>
      <input type="hidden" name="userId" value={team.userId} />
      <button
        type="submit"
        aria-current={isCurrent || undefined}
        className={cn(
          "bg-card focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-xl border p-4 text-left outline-none focus-visible:ring-3",
          isCurrent ? "border-primary" : "border-border hover:bg-muted"
        )}
      >
        <UserAvatar avatarId={team.avatarId} name={team.ownerName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{team.teamName}</span>
          <span className="text-muted-foreground block truncate text-sm">{team.ownerName}</span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="text-sm tabular-nums">{team.record}</span>
          {isCurrent && <Badge variant="secondary">Current</Badge>}
        </span>
      </button>
    </form>
  );
}

/** "Use a different league" and "Back to demo". */
function LeaveLeagueControls() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/#league-id">Use a different league</Link>
      </Button>
      <form action={backToDemo}>
        <Button type="submit" variant="ghost" size="sm">
          Back to demo
        </Button>
      </form>
    </div>
  );
}
