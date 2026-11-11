import { describe, it, expect, vi } from "vitest";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { getTradePositionGrades } from "@/application/use-cases/GetTradePositionGrades";
import type { League } from "@/domain/entities/League";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { TeamTradeImpact } from "@/domain/entities/Trade";

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

function impact(rosterId: string): TeamTradeImpact {
  return {
    rosterId,
    valueBefore: 0,
    valueAfter: 0,
    weeklyGain: 0,
    marketValueSent: 0,
    marketValueReceived: 0,
    lineupBefore: [],
    lineupAfter: [],
    addedFreeAgents: [],
    droppedPlayers: [],
  };
}

/** Rest-of-season points per week. Lineup: QB + RB + 1 bench, no free agents. */
const WEEKLY: [string, Position, number][] = [
  ["qbA1", "QB", 20],
  ["qbA2", "QB", 18],
  ["rbA", "RB", 6],
  ["qbB", "QB", 10],
  ["rbB1", "RB", 16],
  ["rbB2", "RB", 14],
];

/** Playoffs start week 12: with the NFL in week 9, weeks 10 and 11 remain; in week 11, none. */
function makeDataSource(nflWeek = 9) {
  const league: League = {
    leagueId: "L",
    name: "Test League",
    season: "2026",
    currentWeek: nflWeek,
    teamCount: 2,
    settings: { scoringFormat: "ppr", rosterPositions: ["QB", "RB", "BN"], playoffWeekStart: 12 },
  };
  const raw = {
    getLeague: async () => league,
    getRosters: async () => [
      makeRoster("A", ["qbA1", "rbA"], ["qbA2"]),
      makeRoster("B", ["qbB", "rbB1"], ["rbB2"]),
    ],
    getPlayers: async () => new Map(WEEKLY.map(([id, pos]) => [id, makePlayer(id, pos)])),
    getNflState: async () => ({ season: "2026", week: nflWeek, seasonType: "regular" }),
    getWeeklyProjections: vi.fn<FantasyDataSource["getWeeklyProjections"]>(
      async () =>
        new Map(
          WEEKLY.map(([id, , pts]) => [
            id,
            { playerId: id, pointsPpr: pts, pointsHalfPpr: pts, pointsStd: pts },
          ])
        )
    ),
    getSeasonProjections: vi.fn(async () => {
      throw new Error("trade grades shouldn't use season projections");
    }),
  };
  return { dataSource: raw as unknown as FantasyDataSource, raw };
}

const { dataSource, raw } = makeDataSource();

describe("getTradePositionGrades", () => {
  it("grades the league with both after-trade rosters and returns only what moved", async () => {
    // A sends its top QB for B's top RB. QB: A 20 → 18/wk, B 10 → 20, so they swap ranks.
    // RB: A 6 → 16, B 16 → 14, so they swap too. With 2 teams, 1st is B+ and 2nd is D+.
    const proposal = {
      teamA: { rosterId: "A", gives: ["qbA1"] },
      teamB: { rosterId: "B", gives: ["rbB1"] },
    };

    const changes = await getTradePositionGrades({ dataSource }, "L", proposal, {
      teamA: impact("A"),
      teamB: impact("B"),
    });

    expect(
      changes.map((c) => [c.rosterId, c.position, `${c.before.grade}→${c.after.grade}`])
    ).toEqual([
      ["A", "QB", "B+→D+"],
      ["A", "RB", "D+→B+"],
      ["B", "QB", "D+→B+"],
      ["B", "RB", "B+→D+"],
    ]);
  });

  it("returns nothing when the trade doesn't move any ranks", async () => {
    // Backups swap: B starts qbA2 (18) and A starts rbB2 (14), but neither passes the other.
    const proposal = {
      teamA: { rosterId: "A", gives: ["qbA2"] },
      teamB: { rosterId: "B", gives: ["rbB2"] },
    };

    const changes = await getTradePositionGrades({ dataSource }, "L", proposal, {
      teamA: impact("A"),
      teamB: impact("B"),
    });

    expect(changes).toEqual([]);
  });

  it("uses rest-of-season weekly values, not season projections", async () => {
    raw.getWeeklyProjections.mockClear();
    const proposal = {
      teamA: { rosterId: "A", gives: ["qbA1"] },
      teamB: { rosterId: "B", gives: ["rbB1"] },
    };

    await getTradePositionGrades({ dataSource }, "L", proposal, {
      teamA: impact("A"),
      teamB: impact("B"),
    });

    expect(raw.getWeeklyProjections.mock.calls.map(([, week]) => week)).toEqual([10, 11]);
    expect(raw.getSeasonProjections).not.toHaveBeenCalled();
  });

  it("returns nothing when no regular-season weeks remain", async () => {
    const late = makeDataSource(11);
    const proposal = {
      teamA: { rosterId: "A", gives: ["qbA1"] },
      teamB: { rosterId: "B", gives: ["rbB1"] },
    };

    const changes = await getTradePositionGrades({ dataSource: late.dataSource }, "L", proposal, {
      teamA: impact("A"),
      teamB: impact("B"),
    });

    expect(changes).toEqual([]);
    expect(late.raw.getWeeklyProjections).not.toHaveBeenCalled();
  });
});
