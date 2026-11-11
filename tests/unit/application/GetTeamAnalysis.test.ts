import { describe, it, expect, vi } from "vitest";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { getTeamAnalysis } from "@/application/use-cases/GetTeamAnalysis";
import { loadRestOfSeasonPoints } from "@/application/use-cases/LoadRestOfSeasonPoints";
import type { League } from "@/domain/entities/League";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";

function makePlayer(id: string, position: Position): Player {
  return {
    playerId: id,
    firstName: "",
    lastName: id,
    fullName: id,
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

function makeRoster(rosterId: string, ownerId: string, starterIds: string[]): Roster {
  return {
    rosterId,
    ownerId,
    teamName: `Team ${rosterId}`,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    starterIds,
    benchIds: [],
    reserveIds: [],
  };
}

const projection = (playerId: string, pts: number) => ({
  playerId,
  pointsPpr: pts,
  pointsHalfPpr: pts,
  pointsStd: pts,
});

/**
 * Lineup: one RB. Playoffs start week 12. Weekly: A's RB scores 10, B's RB 14, the free agent 6.
 * Season-long the order flips: A's RB 300, B's RB 200, free agent 100.
 */
function makeDataSource(nflWeek: number) {
  const requestedWeeks: number[] = [];
  const league: League = {
    leagueId: "L",
    name: "Test League",
    season: "2026",
    currentWeek: nflWeek,
    teamCount: 2,
    settings: { scoringFormat: "ppr", rosterPositions: ["RB"], playoffWeekStart: 12 },
  };
  const dataSource = {
    getLeague: async () => league,
    getRosters: async () => [makeRoster("1", "me", ["rbA"]), makeRoster("2", "them", ["rbB"])],
    getPlayers: async () =>
      new Map([
        ["rbA", makePlayer("rbA", "RB")],
        ["rbB", makePlayer("rbB", "RB")],
        ["fa", makePlayer("fa", "RB")],
      ]),
    getNflState: async () => ({ season: "2026", week: nflWeek, seasonType: "regular" }),
    getWeeklyProjections: vi.fn(async (_season: string, week: number) => {
      requestedWeeks.push(week);
      return new Map([
        ["rbA", projection("rbA", 10)],
        ["rbB", projection("rbB", 14)],
        ["fa", projection("fa", 6)],
      ]);
    }),
    getSeasonProjections: vi.fn(
      async () =>
        new Map([
          ["rbA", projection("rbA", 300)],
          ["rbB", projection("rbB", 200)],
          ["fa", projection("fa", 100)],
        ])
    ),
  };
  return {
    dataSource: dataSource as unknown as FantasyDataSource,
    raw: dataSource,
    requestedWeeks,
  };
}

describe("loadRestOfSeasonPoints", () => {
  it("loads availability-adjusted points for the remaining weeks", async () => {
    const { dataSource, requestedWeeks } = makeDataSource(9);

    const { weeklyPoints } = await loadRestOfSeasonPoints({ dataSource }, "L");

    expect(requestedWeeks).toEqual([10, 11]); // current week 9 excluded, playoffs from 12
    expect(weeklyPoints?.get(10)?.get("rbB")).toBe(14);
  });

  it("returns null points without loading projections when no weeks remain", async () => {
    const { dataSource, requestedWeeks } = makeDataSource(11);

    expect((await loadRestOfSeasonPoints({ dataSource }, "L")).weeklyPoints).toBeNull();
    expect(requestedWeeks).toEqual([]);
  });
});

describe("getTeamAnalysis", () => {
  it("grades on rest-of-season weekly values, per week", async () => {
    const { dataSource, raw } = makeDataSource(9);

    const analysis = await getTeamAnalysis({ dataSource }, "L", "me");

    expect(analysis?.basis).toEqual({ kind: "rest_of_season", weeks: 2 });
    const rb = analysis?.grades.find((g) => g.position === "RB");
    expect(rb).toMatchObject({ starterValue: 10, replacementValue: 6, surplusValue: 4, rank: 2 });
    expect(raw.getSeasonProjections).not.toHaveBeenCalled();
  });

  it("falls back to season projections when no regular-season weeks remain", async () => {
    const { dataSource } = makeDataSource(11);

    const analysis = await getTeamAnalysis({ dataSource }, "L", "me");

    expect(analysis?.basis).toEqual({ kind: "season" });
    const rb = analysis?.grades.find((g) => g.position === "RB");
    expect(rb).toMatchObject({
      starterValue: 300,
      replacementValue: 100,
      surplusValue: 200,
      rank: 1,
    });
  });

  it("returns null when the user has no roster in the league", async () => {
    const { dataSource } = makeDataSource(9);
    expect(await getTeamAnalysis({ dataSource }, "L", "stranger")).toBeNull();
  });

  it("throws when projections fail to load, so the page can show its error", async () => {
    const { dataSource, raw } = makeDataSource(9);
    raw.getWeeklyProjections.mockRejectedValueOnce(new Error("Sleeper is down"));

    await expect(getTeamAnalysis({ dataSource }, "L", "me")).rejects.toThrow("Sleeper is down");
  });
});
