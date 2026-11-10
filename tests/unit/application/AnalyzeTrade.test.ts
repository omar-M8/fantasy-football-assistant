import { describe, it, expect } from "vitest";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { analyzeTrade } from "@/application/use-cases/AnalyzeTrade";
import type { League } from "@/domain/entities/League";
import type { Player, Position } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
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

/** PPR and standard differ, so the test can tell which format the use case used. */
function projection(playerId: string, ppr: number): PlayerProjection {
  return { playerId, pointsPpr: ppr, pointsHalfPpr: ppr, pointsStd: ppr / 2 };
}

const PLAYERS: [string, Position, number][] = [
  ["qbA1", "QB", 20],
  ["qbA2", "QB", 18],
  ["rbA", "RB", 6],
  ["qbB", "QB", 10],
  ["rbB1", "RB", 16],
  ["rbB2", "RB", 14],
];

/** Fake data source: playoffs start week 12, current week 9 → weeks 10 and 11 remain. */
function makeDataSource(nflWeek = 9) {
  const requestedWeeks: number[] = [];
  const league: League = {
    leagueId: "L",
    name: "Test League",
    season: "2026",
    currentWeek: nflWeek,
    teamCount: 2,
    settings: {
      scoringFormat: "standard",
      rosterPositions: ["QB", "RB", "BN"],
      playoffWeekStart: 12,
    },
  };

  const dataSource = {
    getLeague: async () => league,
    getRosters: async () => [
      makeRoster("A", ["qbA1", "rbA"], ["qbA2"]),
      makeRoster("B", ["qbB", "rbB1"], ["rbB2"]),
    ],
    getPlayers: async () => new Map(PLAYERS.map(([id, pos]) => [id, makePlayer(id, pos)])),
    getNflState: async () => ({ season: "2026", week: nflWeek, seasonType: "regular" }),
    getWeeklyProjections: async (_season: string, week: number) => {
      requestedWeeks.push(week);
      return new Map(PLAYERS.map(([id, , pts]) => [id, projection(id, pts)]));
    },
  } as unknown as FantasyDataSource;

  return { dataSource, requestedWeeks };
}

const PROPOSAL = {
  teamA: { rosterId: "A", gives: ["qbA2"] },
  teamB: { rosterId: "B", gives: ["rbB2"] },
};

describe("analyzeTrade", () => {
  it("loads the remaining weeks and evaluates the trade in the league's scoring format", async () => {
    const { dataSource, requestedWeeks } = makeDataSource();

    const result = await analyzeTrade({ dataSource }, "L", PROPOSAL);

    expect(requestedWeeks).toEqual([10, 11]); // current week 9 excluded, playoffs from 12
    // Standard scoring halves every projection: A's RB goes 3 → 7 per week (+4)
    expect(result?.teamA.weeklyGain).toBe(4);
    expect(result?.verdict).toBe("win_win");
  });

  it("returns null without loading projections when no regular-season weeks remain", async () => {
    const { dataSource, requestedWeeks } = makeDataSource(11);

    expect(await analyzeTrade({ dataSource }, "L", PROPOSAL)).toBeNull();
    expect(requestedWeeks).toEqual([]);
  });

  it("passes on evaluateTrade's rejection of an invalid proposal", async () => {
    const { dataSource } = makeDataSource();
    const invalid = { ...PROPOSAL, teamA: { rosterId: "A", gives: ["rbB1"] } };

    await expect(analyzeTrade({ dataSource }, "L", invalid)).rejects.toThrow("Team A can't trade");
  });
});
