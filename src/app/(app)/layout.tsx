import { getActiveContext } from "@/lib/active-context";
import { sleeperClient } from "@/lib/sleeper-client";
import { ModeBanner } from "@/components/league/ModeBanner";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Redirects to /select-team when a league is chosen but no team yet.
  const context = await getActiveContext();

  return (
    <div className="flex flex-col">
      {context.isDemo ? (
        <ModeBanner isDemo />
      ) : (
        <ModeBanner isDemo={false} leagueName={await getLeagueName(context.leagueId)} />
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}

/** The banner shouldn't take the page down if the league can't load; the page will say so. */
async function getLeagueName(leagueId: string): Promise<string | null> {
  try {
    return (await sleeperClient.getLeague(leagueId)).name;
  } catch {
    return null;
  }
}
