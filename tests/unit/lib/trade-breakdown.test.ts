import { describe, it, expect } from "vitest";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import { evaluateTrade, type TradeContext } from "@/domain/services/evaluateTrade";
import { getLineupChanges, getWeeklyImpactRows } from "@/lib/trade-breakdown";

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

/** Same league as evaluateTrade.test.ts. Lineup: QB + RB + 1 bench. */
const POINTS: Record<string, [Position, number]> = {
  qbA1: ["QB", 20],
  qbA2: ["QB", 18],
  rbA: ["RB", 5],
  qbB: ["QB", 10],
  rbB1: ["RB", 15],
  rbB2: ["RB", 14],
  faQB: ["QB", 12],
  faRB: ["RB", 6],
};

/** rbB2 is on bye in week 11. */
function makeContext(): TradeContext {
  const week10 = new Map(Object.entries(POINTS).map(([id, [, pts]]) => [id, pts]));
  const week11 = new Map(week10);
  week11.delete("rbB2");
  return {
    rosterPositions: ["QB", "RB", "BN"],
    rosters: [
      makeRoster("A", ["qbA1", "rbA"], ["qbA2"]),
      makeRoster("B", ["qbB", "rbB1"], ["rbB2"]),
    ],
    players: new Map(Object.entries(POINTS).map(([id, [pos]]) => [id, makePlayer(id, pos)])),
    weeklyPoints: new Map([
      [10, week10],
      [11, week11],
    ]),
  };
}

// A sends qbA2 for rbB2. A's lineup: qbA1 + rbA (25/week) → qbA1 + rbB2 in week 10 (34),
// and qbA1 + rbA again in week 11 while rbB2 is on bye (25).
const trade = {
  teamA: { rosterId: "A", gives: ["qbA2"] },
  teamB: { rosterId: "B", gives: ["rbB2"] },
};
const evaluation = evaluateTrade(trade, makeContext());

describe("getLineupChanges", () => {
  it("lists players whose starts change, biggest points change first", () => {
    expect(getLineupChanges(evaluation.teamA, evaluation)).toEqual([
      { playerId: "rbB2", startsBefore: 0, startsAfter: 1, pointsBefore: 0, pointsAfter: 14 },
      { playerId: "rbA", startsBefore: 2, startsAfter: 1, pointsBefore: 10, pointsAfter: 5 },
    ]);
  });
});

describe("getWeeklyImpactRows", () => {
  it("gives each week's points before and after, and flags starters on bye", () => {
    expect(getWeeklyImpactRows(evaluation.teamA, evaluation)).toEqual([
      { week: 10, before: 25, after: 34, change: 9, byes: [] },
      { week: 11, before: 25, after: 25, change: 0, byes: ["rbB2"] },
    ]);
  });
});
