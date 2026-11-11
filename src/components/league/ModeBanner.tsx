import Link from "next/link";

import { backToDemo } from "@/app/actions/league";
import { Button } from "@/components/ui/button";

type ModeBannerProps =
  | { isDemo: true }
  | {
      isDemo: false;
      /** null if the league's name couldn't be loaded. */
      leagueName: string | null;
    };

/**
 * The strip under the navbar: in demo mode, says so and offers the visitor's own league;
 * otherwise names their league with "Switch team" and "Back to demo".
 */
export function ModeBanner(props: ModeBannerProps) {
  return (
    <div className="bg-secondary text-secondary-foreground border-b px-4 py-2 text-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {props.isDemo ? (
          <>
            <span>You&apos;re viewing the demo team.</span>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href="/#league-id">Use your own league</Link>
            </Button>
          </>
        ) : (
          <>
            <span>
              League: <span className="font-medium">{props.leagueName ?? "Your league"}</span>
            </span>
            <span className="flex items-center gap-2">
              <Button asChild variant="outline" size="xs">
                <Link href="/select-team">Switch team</Link>
              </Button>
              <form action={backToDemo}>
                <Button type="submit" variant="ghost" size="xs">
                  Back to demo
                </Button>
              </form>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
