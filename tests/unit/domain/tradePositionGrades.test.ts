import { describe, it, expect } from "vitest";
import type { Position } from "@/domain/entities/Player";
import type { Grade, PositionGrade } from "@/domain/entities/PositionGrade";
import type { Roster } from "@/domain/entities/Roster";
import {
  buildRosterAfterTrade,
  getPositionGradeChanges,
  getRostersAfterTrade,
} from "@/domain/services/tradePositionGrades";

function makeRoster(
  rosterId: string,
  starterIds: string[],
  benchIds: string[],
  reserveIds: string[] = []
): Roster {
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
    reserveIds,
  };
}

const noMoves = { addedFreeAgents: [], droppedPlayers: [] };

describe("buildRosterAfterTrade", () => {
  const roster = makeRoster("A", ["qb", "rb", "0"], ["wr"], ["ir"]);

  it("removes what was sent from wherever it was and puts arrivals on the bench", () => {
    const after = buildRosterAfterTrade(roster, ["rb", "ir"], ["newRb"], noMoves);

    expect(after.starterIds).toEqual(["qb", "0"]);
    expect(after.benchIds).toEqual(["wr", "newRb"]);
    expect(after.reserveIds).toEqual([]);
    expect(after.teamName).toBe("Team A");
  });

  it("adds signed free agents and removes dropped players", () => {
    const after = buildRosterAfterTrade(roster, ["rb"], [], {
      addedFreeAgents: ["fa"],
      droppedPlayers: ["wr"],
    });

    expect(after.benchIds).toEqual(["fa"]);
  });

  it("leaves out a received player the team then had to drop", () => {
    const after = buildRosterAfterTrade(roster, [], ["newRb"], {
      addedFreeAgents: [],
      droppedPlayers: ["newRb"],
    });

    expect(after.benchIds).toEqual(["wr"]);
  });
});

describe("getRostersAfterTrade", () => {
  it("swaps both trading teams and leaves every other roster as it was", () => {
    const a = makeRoster("A", ["qbA"], []);
    const b = makeRoster("B", ["rbB"], []);
    const c = makeRoster("C", ["wrC"], []);
    const proposal = {
      teamA: { rosterId: "A", gives: ["qbA"] },
      teamB: { rosterId: "B", gives: ["rbB"] },
    };

    const [afterA, afterB, afterC] = getRostersAfterTrade([a, b, c], proposal, {
      a: noMoves,
      b: noMoves,
    } as never);

    expect([...afterA.starterIds, ...afterA.benchIds]).toEqual(["rbB"]);
    expect([...afterB.starterIds, ...afterB.benchIds]).toEqual(["qbA"]);
    expect(afterC).toBe(c);
  });
});

function grade(rosterId: string, position: Position, g: Grade, rank: number): PositionGrade {
  return {
    rosterId,
    position,
    grade: g,
    rank,
    teamCount: 12,
    starterCount: 1,
    starterValue: 0,
    replacementValue: 0,
    surplusValue: 0,
  };
}

describe("getPositionGradeChanges", () => {
  const before = [
    grade("A", "QB", "B", 5),
    grade("B", "QB", "A", 2),
    grade("C", "QB", "C", 8),
    grade("A", "RB", "C+", 7),
    grade("B", "RB", "B+", 4),
    grade("A", "WR", "B-", 6),
  ];
  const after = [
    grade("A", "QB", "B", 5), // unchanged
    grade("B", "QB", "A", 2), // unchanged
    grade("C", "QB", "C-", 9), // not a trading team
    grade("A", "RB", "B", 4),
    grade("B", "RB", "C+", 7),
    grade("A", "WR", "B-", 5), // rank moves, grade doesn't
  ];

  it("keeps only positions whose grade or rank moved, for the given teams, team A first", () => {
    const changes = getPositionGradeChanges(before, after, ["A", "B"]);

    expect(changes.map((c) => [c.rosterId, c.position, c.before.rank, c.after.rank])).toEqual([
      ["A", "RB", 7, 4],
      ["A", "WR", 6, 5],
      ["B", "RB", 4, 7],
    ]);
  });

  it("returns nothing when no grade moves", () => {
    expect(getPositionGradeChanges(before, before, ["A", "B"])).toEqual([]);
  });
});
