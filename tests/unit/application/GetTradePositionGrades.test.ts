import { describe, it, expect } from "vitest";
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

/** Season-long projections. Lineup: QB + RB + 1 bench, no free agents. */
const SEASON: [string, Position, number][] = [
  ["qbA1", "QB", 300],
  ["qbA2", "QB", 280],
  ["rbA", "RB", 100],
  ["qbB", "QB", 150],
  ["rbB1", "RB", 250],
  ["rbB2", "RB", 220],
];

const league: League = {
  leagueId: "L",
  name: "Test League",
  season: "2026",
  currentWeek: 9,
  teamCount: 2,
  settings: { scoringFormat: "ppr", rosterPositions: ["QB", "RB", "BN"] },
};

const dataSource = {
  getLeague: async () => league,
  getRosters: async () => [
    makeRoster("A", ["qbA1", "rbA"], ["qbA2"]),
    makeRoster("B", ["qbB", "rbB1"], ["rbB2"]),
  ],
  getPlayers: async () => new Map(SEASON.map(([id, pos]) => [id, makePlayer(id, pos)])),
  getSeasonProjections: async () =>
    new Map(
      SEASON.map(([id, , pts]) => [
        id,
        { playerId: id, pointsPpr: pts, pointsHalfPpr: pts, pointsStd: pts },
      ])
    ),
} as unknown as FantasyDataSource;

describe("getTradePositionGrades", () => {
  it("grades the league with both after-trade rosters and returns only what moved", async () => {
    // A sends its top QB for B's top RB. QB: A 300 → 280, B 150 → 300, so they swap ranks.
    // RB: A 100 → 250, B 250 → 220, so they swap too. With 2 teams, 1st is B+ and 2nd is D+.
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
    // Backups swap: B starts qbA2 (280) and A starts rbB2 (220), but neither passes the other.
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
});
