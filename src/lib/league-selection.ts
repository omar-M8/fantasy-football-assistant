import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { DataSourceNotFoundError } from "@/application/ports/DataSourceErrors";
import type { League } from "@/domain/entities/League";
import type { Roster } from "@/domain/entities/Roster";
import { findUserRoster } from "@/domain/services/findUserRoster";
import { LEAGUE_COOKIE, SLEEPER_ID_PATTERN, USER_COOKIE } from "@/lib/league-cookies";
import type { LeagueFormState } from "@/lib/league-form";

export type { LeagueFormState };

/** The subset of Next's cookie store the actions use, so tests can pass a fake. */
export type CookieWriter = {
  set(name: string, value: string, options: CookieOptions): void;
  delete(name: string): void;
  get(name: string): { value: string } | undefined;
};

type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

export type ActionDeps = {
  readonly dataSource: FantasyDataSource;
  readonly cookies: CookieWriter;
  /** Next's redirect(). It throws, so it's always called last and outside try blocks. */
  readonly redirect: (url: string) => never;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ONE_YEAR_SECONDS,
};

const LEAGUE_URL_PATTERN = /leagues\/(\d+)/;
/** Real Sleeper league IDs are 18–19 digits; this only rejects obvious typos. */
const LEAGUE_ID_PATTERN = /^\d{6,32}$/;

/**
 * Reads a league ID from what the visitor typed: the bare ID, or a pasted Sleeper URL
 * like "https://sleeper.com/leagues/1360246916935340032/team".
 */
export function parseLeagueIdInput(
  raw: string
):
  | { readonly ok: true; readonly leagueId: string }
  | { readonly ok: false; readonly message: string } {
  const value = raw.trim();
  if (value === "") return { ok: false, message: "Enter your Sleeper league ID." };

  const leagueId = value.match(LEAGUE_URL_PATTERN)?.[1] ?? value;
  if (!LEAGUE_ID_PATTERN.test(leagueId)) {
    return {
      ok: false,
      message: "A league ID is a long number, like 1360246916935340032. Check for typos.",
    };
  }
  return { ok: true, leagueId };
}

/**
 * LeagueIdForm's action: validate the ID, confirm the league exists, warn once if it's not
 * from the current NFL season, then choose it (clearing any team picked in another league)
 * and send the visitor to /select-team.
 */
export async function submitLeagueIdWith(
  deps: ActionDeps,
  _previous: LeagueFormState,
  formData: FormData
): Promise<LeagueFormState> {
  const raw = String(formData.get("leagueId") ?? "");
  const parsed = parseLeagueIdInput(raw);
  if (!parsed.ok) return { status: "error", message: parsed.message, value: raw };
  const { leagueId } = parsed;

  let league: League;
  try {
    league = await deps.dataSource.getLeague(leagueId);
  } catch (error) {
    if (error instanceof DataSourceNotFoundError) {
      return {
        status: "error",
        message: "We couldn't find a Sleeper league with that ID.",
        value: raw,
      };
    }
    console.error("[league] getLeague failed", error);
    return {
      status: "error",
      message: "We couldn't reach Sleeper just now. Please try again in a moment.",
      value: raw,
    };
  }

  // Confirmation is only for this exact league, so a different ID is checked afresh.
  const confirmed = formData.get("confirmSeason") === leagueId;
  if (!confirmed) {
    const currentSeason = await getCurrentSeason(deps.dataSource);
    if (currentSeason !== null && league.season !== currentSeason) {
      return {
        status: "warning",
        leagueId,
        message: `"${league.name}" is from the ${league.season} season, but the current NFL season is ${currentSeason}. Its rosters and projections may be out of date.`,
      };
    }
  }

  deps.cookies.set(LEAGUE_COOKIE, leagueId, COOKIE_OPTIONS);
  deps.cookies.delete(USER_COOKIE);
  deps.redirect("/select-team");
}

/** The season check is a courtesy: if the NFL state can't load, don't block the visitor. */
async function getCurrentSeason(dataSource: FantasyDataSource): Promise<string | null> {
  try {
    return (await dataSource.getNflState()).season;
  } catch (error) {
    console.error("[league] getNflState failed", error);
    return null;
  }
}

/**
 * /select-team's action: check the chosen user owns a team in the chosen league, remember
 * them, and go to the dashboard. Problems send the visitor back with an error code.
 */
export async function selectTeamWith(deps: ActionDeps, formData: FormData): Promise<never> {
  const leagueId = deps.cookies.get(LEAGUE_COOKIE)?.value;
  if (leagueId === undefined || !SLEEPER_ID_PATTERN.test(leagueId)) deps.redirect("/#league-id");

  const userId = String(formData.get("userId") ?? "");
  if (!SLEEPER_ID_PATTERN.test(userId)) deps.redirect("/select-team?error=team");

  let rosters: readonly Roster[] | null;
  try {
    rosters = await deps.dataSource.getRosters(leagueId);
  } catch (error) {
    console.error("[league] getRosters failed", error);
    rosters = null;
  }
  if (rosters === null) deps.redirect("/select-team?error=unavailable");
  if (findUserRoster(rosters, userId) === null) deps.redirect("/select-team?error=team");

  deps.cookies.set(USER_COOKIE, userId, COOKIE_OPTIONS);
  deps.redirect("/dashboard");
}

/** Leaves the visitor's league and goes back to the built-in demo team. */
export function backToDemoWith(deps: Pick<ActionDeps, "cookies" | "redirect">): never {
  deps.cookies.delete(LEAGUE_COOKIE);
  deps.cookies.delete(USER_COOKIE);
  deps.redirect("/dashboard");
}
