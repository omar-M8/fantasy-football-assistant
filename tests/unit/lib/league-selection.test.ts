import { describe, it, expect, vi } from "vitest";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { DataSourceNotFoundError } from "@/application/ports/DataSourceErrors";
import type { League } from "@/domain/entities/League";
import type { Roster } from "@/domain/entities/Roster";
import { INITIAL_LEAGUE_FORM_STATE } from "@/lib/league-form";
import {
  backToDemoWith,
  parseLeagueIdInput,
  selectTeamWith,
  submitLeagueIdWith,
  type ActionDeps,
} from "@/lib/league-selection";

const LEAGUE_ID = "1180000000000000000";
const OWNER = "870000000000000000";

function makeLeague(season: string): League {
  return {
    leagueId: LEAGUE_ID,
    name: "Dynasty Dads",
    season,
    currentWeek: 10,
    teamCount: 12,
    settings: { scoringFormat: "ppr", rosterPositions: ["QB"] },
  };
}

function makeRoster(ownerId: string): Roster {
  return {
    rosterId: "1",
    ownerId,
    teamName: "Team",
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    starterIds: [],
    benchIds: [],
    reserveIds: [],
  };
}

class Redirect extends Error {
  constructor(readonly url: string) {
    super(`REDIRECT ${url}`);
  }
}

/** A fake data source and cookie jar. redirect() throws, like Next's. */
function makeDeps(dataSource: Partial<FantasyDataSource>, cookies: Record<string, string> = {}) {
  const jar = new Map(Object.entries(cookies));
  const deps: ActionDeps = {
    dataSource: {
      getNflState: async () => ({ season: "2026", week: 10, seasonType: "regular" }),
      ...dataSource,
    } as FantasyDataSource,
    cookies: {
      set: (name, value) => void jar.set(name, value),
      delete: (name) => void jar.delete(name),
      get: (name) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    },
    redirect: (url) => {
      throw new Redirect(url);
    },
  };
  return { deps, jar };
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Runs an action and returns where it redirected, or its returned state. */
async function run<T>(action: () => Promise<T>): Promise<{ redirect: string } | { state: T }> {
  try {
    return { state: await action() };
  } catch (error) {
    if (error instanceof Redirect) return { redirect: error.url };
    throw error;
  }
}

describe("parseLeagueIdInput", () => {
  it.each([
    ["1180000000000000000", "1180000000000000000"],
    ["  1180000000000000000 ", "1180000000000000000"],
    ["https://sleeper.com/leagues/1180000000000000000/team", "1180000000000000000"],
  ])("accepts %j", (raw, leagueId) => {
    expect(parseLeagueIdInput(raw)).toEqual({ ok: true, leagueId });
  });

  it.each([
    ["", "Enter your Sleeper league ID."],
    ["   ", "Enter your Sleeper league ID."],
    ["my league", "long number"],
    ["12345", "long number"],
    ["1180000000000000000; drop", "long number"],
  ])("rejects %j", (raw, message) => {
    const result = parseLeagueIdInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(message);
  });
});

describe("submitLeagueIdWith", () => {
  const submit = (deps: ActionDeps, fields: Record<string, string>) =>
    run(() => submitLeagueIdWith(deps, INITIAL_LEAGUE_FORM_STATE, form(fields)));

  it("shows a format error without calling Sleeper", async () => {
    const getLeague = vi.fn();
    const { deps } = makeDeps({ getLeague });

    expect(await submit(deps, { leagueId: "abc" })).toMatchObject({
      state: { status: "error", value: "abc" },
    });
    expect(getLeague).not.toHaveBeenCalled();
  });

  it("says when the league doesn't exist", async () => {
    const { deps, jar } = makeDeps({
      getLeague: async () => {
        throw new DataSourceNotFoundError("404");
      },
    });

    expect(await submit(deps, { leagueId: LEAGUE_ID })).toEqual({
      state: {
        status: "error",
        message: "We couldn't find a Sleeper league with that ID.",
        value: LEAGUE_ID,
      },
    });
    expect(jar.size).toBe(0);
  });

  it("says when Sleeper can't be reached", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = makeDeps({
      getLeague: async () => {
        throw new Error("500");
      },
    });

    expect(await submit(deps, { leagueId: LEAGUE_ID })).toMatchObject({
      state: { status: "error", message: expect.stringContaining("couldn't reach Sleeper") },
    });
    error.mockRestore();
  });

  it("chooses the league, clears the old team, and goes to /select-team", async () => {
    const { deps, jar } = makeDeps(
      { getLeague: async () => makeLeague("2026") },
      { user_id: OWNER, league_id: "999999999" }
    );

    expect(await submit(deps, { leagueId: LEAGUE_ID })).toEqual({ redirect: "/select-team" });
    expect(jar.get("league_id")).toBe(LEAGUE_ID);
    expect(jar.has("user_id")).toBe(false);
  });

  it("warns once about a league from another season, then accepts it when confirmed", async () => {
    const { deps, jar } = makeDeps({ getLeague: async () => makeLeague("2025") });

    expect(await submit(deps, { leagueId: LEAGUE_ID })).toEqual({
      state: {
        status: "warning",
        leagueId: LEAGUE_ID,
        message: expect.stringContaining(
          "from the 2025 season, but the current NFL season is 2026"
        ),
      },
    });
    expect(jar.size).toBe(0);

    expect(await submit(deps, { leagueId: LEAGUE_ID, confirmSeason: LEAGUE_ID })).toEqual({
      redirect: "/select-team",
    });
  });

  it("doesn't let a confirmation for one league skip the check for another", async () => {
    const { deps } = makeDeps({ getLeague: async () => makeLeague("2025") });

    expect(
      await submit(deps, { leagueId: LEAGUE_ID, confirmSeason: "1111111111111111111" })
    ).toMatchObject({ state: { status: "warning" } });
  });

  it("skips the season check if the NFL state can't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = makeDeps({
      getLeague: async () => makeLeague("2025"),
      getNflState: async () => {
        throw new Error("down");
      },
    });

    expect(await submit(deps, { leagueId: LEAGUE_ID })).toEqual({ redirect: "/select-team" });
    error.mockRestore();
  });
});

describe("selectTeamWith", () => {
  const rosters = async () => [makeRoster(OWNER)];

  it("remembers a team the user owns and opens the dashboard", async () => {
    const { deps, jar } = makeDeps({ getRosters: rosters }, { league_id: LEAGUE_ID });

    expect(await run(() => selectTeamWith(deps, form({ userId: OWNER })))).toEqual({
      redirect: "/dashboard",
    });
    expect(jar.get("user_id")).toBe(OWNER);
  });

  it("sends the visitor to enter a league if none is chosen", async () => {
    const { deps } = makeDeps({ getRosters: rosters });

    expect(await run(() => selectTeamWith(deps, form({ userId: OWNER })))).toEqual({
      redirect: "/#league-id",
    });
  });

  it.each([
    ["a malformed user ID", "abc"],
    ["someone with no team in the league", "123456789"],
  ])("rejects %s", async (_label, userId) => {
    const { deps, jar } = makeDeps({ getRosters: rosters }, { league_id: LEAGUE_ID });

    expect(await run(() => selectTeamWith(deps, form({ userId })))).toEqual({
      redirect: "/select-team?error=team",
    });
    expect(jar.has("user_id")).toBe(false);
  });

  it("reports when the rosters can't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = makeDeps(
      {
        getRosters: async () => {
          throw new Error("down");
        },
      },
      { league_id: LEAGUE_ID }
    );

    expect(await run(() => selectTeamWith(deps, form({ userId: OWNER })))).toEqual({
      redirect: "/select-team?error=unavailable",
    });
    error.mockRestore();
  });
});

describe("backToDemoWith", () => {
  it("clears both cookies and opens the dashboard", async () => {
    const { deps, jar } = makeDeps({}, { league_id: LEAGUE_ID, user_id: OWNER });

    expect(await run(async () => backToDemoWith(deps))).toEqual({ redirect: "/dashboard" });
    expect(jar.size).toBe(0);
  });
});
