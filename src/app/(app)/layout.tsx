import { getActiveLeagueId } from "@/lib/league-context";
import { DEMO_LEAGUE_ID } from "@/config/demo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const activeLeagueId = await getActiveLeagueId();
  const isDemo = activeLeagueId === DEMO_LEAGUE_ID;

  return (
    <div className="flex flex-col">
      {isDemo && (
        <div className="bg-secondary text-secondary-foreground border-b px-4 py-2 text-center text-sm">
          Demo Mode Active (League ID: {activeLeagueId}) - Some features may be limited or
          unavailable.
        </div>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
