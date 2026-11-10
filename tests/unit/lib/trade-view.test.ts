import { describe, it, expect, vi } from "vitest";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import type { League } from "@/domain/entities/League";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { ParsedTradeSearchParams } from "@/lib/trade-search-params";
import { getTradeView, type TradeViewContext } from "@/lib/trade-view";

function makePlayer(id: string, position: Position): Player {
  return {
    playerId: id,
    firstName: "",
    lastName: id,
    fullName: `Player ${id}`,
    age: 25,
    team: null,
    position,
    height: "6'0\"",
    weight: 200,
    injuryStatus: null,
    status: "active",
    number: null,
  };
}

function makeRoster(rosterId: string, starterIds: string[], benchIds: string[]): Roster {
  return {
    rosterId,
    ownerId: `owner-${rosterId}`,
    teamName: `Team ${rosterId}`,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    starterIds,
    benchIds,
    reserveIds: [],
  };
}

const POINTS: [string, Position, number][] = [
  ["10", "QB", 20],
  ["11", "QB", 18],
  ["12", "RB", 6],
  ["20", "QB", 10],
  ["21", "RB", 16],
  ["22", "RB", 14],
];
const players = new Map(POINTS.map(([id, pos]) => [id, makePlayer(id, pos)]));
const rosters = [makeRoster("1", ["10", "12"], ["11"]), makeRoster("2", ["20", "21"], ["22"])];

/** Playoffs start week 12, so with the NFL in week 11 no regular-season weeks remain. */
function makeContext(
  nflWeek: number,
  overrides: Partial<FantasyDataSource> = {}
): TradeViewContext {
  const league: League = {
    leagueId: "L",
    name: "Test League",
    season: "2026",
    currentWeek: nflWeek,
    teamCount: 2,
    settings: { scoringFormat: "ppr", rosterPositions: ["QB", "RB", "BN"], playoffWeekStart: 12 },
  };
  const dataSource = {
    getLeague: async () => league,
    getRosters: async () => rosters,
    getPlayers: async () => players,
    getNflState: async () => ({ season: "2026", week: nflWeek, seasonType: "regular" }),
    getWeeklyProjections: async () =>
      new Map(
        POINTS.map(([id, , pts]) => [
          id,
          { playerId: id, pointsPpr: pts, pointsHalfPpr: pts, pointsStd: pts },
        ])
      ),
    ...overrides,
  } as unknown as FantasyDataSource;
  return { dataSource, leagueId: "L", rosters, players, myRoster: rosters[0] };
}

const ok = (partner: string, give: string[], get: string[]): ParsedTradeSearchParams => ({
  status: "ok",
  trade: { partner, give, get },
});

describe("getTradeView", () => {
  it("prompts to build a trade when the URL is empty or invalid", async () => {
    expect(await getTradeView({ status: "empty" }, makeContext(9))).toEqual({
      kind: "message",
      title: "Build a trade to analyze it",
    });
    expect(
      await getTradeView({ status: "invalid", message: "Pick a trade partner" }, makeContext(9))
    ).toEqual({
      kind: "message",
      title: "Build a trade to analyze it",
      description: "Pick a trade partner",
    });
  });

  it("explains that no regular-season weeks are left", async () => {
    const view = await getTradeView(ok("2", ["11"], ["22"]), makeContext(11));

    expect(view).toEqual({
      kind: "message",
      title: "No regular-season weeks left",
      description: "Trades are valued over the remaining regular season, and it's over.",
    });
  });

  it("rejects a partner that isn't in the league", async () => {
    const view = await getTradeView(ok("9", ["11"], []), makeContext(9));
    expect(view).toMatchObject({
      kind: "message",
      title: "That trade partner isn't in this league.",
    });
  });

  it("names the problem when a player isn't on the right roster", async () => {
    const view = await getTradeView(ok("2", ["21"], []), makeContext(9));
    expect(view).toEqual({
      kind: "message",
      title: "This trade can't be analyzed",
      description: "Player 21 is not on your roster.",
    });
  });

  it("shows a retry message when loading fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = makeContext(9, {
      getWeeklyProjections: async () => {
        throw new Error("Sleeper is down");
      },
    });

    const view = await getTradeView(ok("2", ["11"], ["22"]), failing);

    expect(view).toMatchObject({ title: "We couldn't analyze this trade right now" });
    error.mockRestore();
  });

  it("returns the analysis with names for both sides and the reasons", async () => {
    const view = await getTradeView(ok("2", ["11"], ["22"]), makeContext(9));

    expect(view.kind).toBe("analysis");
    if (view.kind !== "analysis") return;
    expect(view.partnerName).toBe("Team 2");
    expect(view.sending).toEqual(["Player 11"]);
    expect(view.receiving).toEqual(["Player 22"]);
    expect(view.evaluation.verdict).toBe("win_win");
    expect(view.playerNames).toMatchObject({ "22": "Player 22" }); // "You start Player 22…"
    // Breakdown: Player 22 (RB 14) replaces Player 12 (RB 6) in both remaining weeks.
    expect(view.lineupChanges.map((c) => c.playerId)).toEqual(["22", "12"]);
    expect(view.weeklyRows.map((r) => r.change)).toEqual([8, 8]);
    expect(view.breakdownPlayers["22"]).toEqual({ name: "Player 22", position: "RB" });
  });
});
