import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_LEAGUE_ID, DEMO_USER_ID } from "@/config/demo";
import { LEAGUE_COOKIE, SLEEPER_ID_PATTERN, USER_COOKIE } from "@/lib/league-cookies";

/** Whose team the app is showing. */
export type ActiveContext = {
  readonly leagueId: string;
  readonly userId: string;
  /** True when no league is chosen, so the built-in demo league and team are shown. */
  readonly isDemo: boolean;
};

export type ResolvedContext =
  | { readonly status: "ready"; readonly context: ActiveContext }
  /** A league is chosen but no team in it yet. */
  | { readonly status: "needs_team"; readonly leagueId: string };

export const DEMO_CONTEXT: ActiveContext = {
  leagueId: DEMO_LEAGUE_ID,
  userId: DEMO_USER_ID,
  isDemo: true,
};

/**
 * Decides whose team to show from the two cookie values.
 *
 * - No (or malformed) league cookie → the demo league and team. A leftover user cookie
 *   is ignored, since it belongs to a league that's no longer chosen.
 * - League but no (or malformed) user cookie → the visitor still has to pick a team.
 * - Both → their league and team.
 */
export function resolveActiveContext(cookieValues: {
  readonly leagueId?: string;
  readonly userId?: string;
}): ResolvedContext {
  const leagueId = valid(cookieValues.leagueId);
  if (!leagueId) return { status: "ready", context: DEMO_CONTEXT };

  const userId = valid(cookieValues.userId);
  if (!userId) return { status: "needs_team", leagueId };

  return { status: "ready", context: { leagueId, userId, isDemo: false } };
}

/**
 * The active league and team for this request. Redirects to /select-team when a league is
 * chosen but no team is, so pages can always rely on having both.
 */
export async function getActiveContext(): Promise<ActiveContext> {
  const store = await cookies();
  const resolved = resolveActiveContext({
    leagueId: store.get(LEAGUE_COOKIE)?.value,
    userId: store.get(USER_COOKIE)?.value,
  });
  if (resolved.status === "needs_team") redirect("/select-team");
  return resolved.context;
}

/** The chosen league ID, or null in demo mode. For /select-team, which runs before a team is picked. */
export async function getChosenLeagueId(): Promise<string | null> {
  const store = await cookies();
  return valid(store.get(LEAGUE_COOKIE)?.value);
}

/** The chosen user ID, if any (to highlight the current team on /select-team). */
export async function getChosenUserId(): Promise<string | null> {
  const store = await cookies();
  return valid(store.get(USER_COOKIE)?.value);
}

function valid(value: string | undefined): string | null {
  return value !== undefined && SLEEPER_ID_PATTERN.test(value) ? value : null;
}
