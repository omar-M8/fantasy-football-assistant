import { describe, it, expect } from "vitest";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { TradeProposal } from "@/domain/entities/Trade";
import { evaluateTrade, type TradeContext } from "@/domain/services/evaluateTrade";

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

/**
 * A tiny league, worked out by hand. Lineup: QB + RB + 1 bench (limit 3).
 * Every player scores the same in both weeks. Free agents: faQB (12), faRB (6),
 * so replacement level is QB 12 and RB 6 per week.
 */
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

function makeContext(rosters: Roster[]): TradeContext {
  const weekPoints = new Map(Object.entries(POINTS).map(([id, [, pts]]) => [id, pts]));
  return {
    rosterPositions: ["QB", "RB", "BN"],
    rosters,
    players: new Map(Object.entries(POINTS).map(([id, [pos]]) => [id, makePlayer(id, pos)])),
    weeklyPoints: new Map([
      [10, weekPoints],
      [11, weekPoints],
    ]),
  };
}

const teamA = makeRoster("A", ["qbA1", "rbA"], ["qbA2"]); // starts 20 + 5 = 25/week
const teamB = makeRoster("B", ["qbB", "rbB1"], ["rbB2"]); // starts 10 + 15 = 25/week
const context = makeContext([teamA, teamB]);

function trade(aGives: string[], bGives: string[]): TradeProposal {
  return { teamA: { rosterId: "A", gives: aGives }, teamB: { rosterId: "B", gives: bGives } };
}

describe("evaluateTrade", () => {
  describe("a 1-for-1 that helps both teams", () => {
    // A swaps its backup QB for B's backup RB: each team fills its weak spot
    const result = evaluateTrade(trade(["qbA2"], ["rbB2"]), context);

    it("compares each team's value before and after", () => {
      expect(result.teamA).toMatchObject({ valueBefore: 50, valueAfter: 68, weeklyGain: 9 }); // RB 5 → 14
      expect(result.teamB).toMatchObject({ valueBefore: 50, valueAfter: 66, weeklyGain: 8 }); // QB 10 → 18
      expect(result.verdict).toBe("win_win");
    });

    it("measures market value above replacement and scores fairness from it", () => {
      // qbA2: (18 − 12) × 2 = 12; rbB2: (14 − 6) × 2 = 16
      expect(result.teamA).toMatchObject({ marketValueSent: 12, marketValueReceived: 16 });
      expect(result.teamB).toMatchObject({ marketValueSent: 16, marketValueReceived: 12 });
      expect(result.fairness).toBe(75); // 12 / 16
    });

    it("explains the result in at most four reasons, most important first", () => {
      expect(result.reasons).toEqual([
        { kind: "weekly_gain", side: "a", weeklyGain: 9 },
        { kind: "weekly_gain", side: "b", weeklyGain: 8 },
        { kind: "market_value_gap", side: "b", sent: 16, received: 12 },
        { kind: "starts_weeks", side: "a", playerId: "rbB2", weeksStarted: 2, totalWeeks: 2 },
      ]);
    });

    it("returns each week's lineup before and after", () => {
      expect(result.teamA.lineupBefore).toHaveLength(2);
      expect(result.teamA.lineupAfter[0].lineup.map((s) => s.playerId)).toEqual(["qbA1", "rbB2"]);
    });
  });

  it("favours the team that gains when the other loses", () => {
    // A's 5-point RB for B's 15-point RB: A +10/week, B −1/week (rbB2 replaces rbB1)
    const result = evaluateTrade(trade(["rbA"], ["rbB1"]), context);

    expect(result.teamA.weeklyGain).toBe(10);
    expect(result.teamB.weeklyGain).toBe(-1);
    expect(result.verdict).toBe("favours_a");
  });

  it("fills the spot a 2-for-1 opens and drops a player from the team that's over the limit", () => {
    const result = evaluateTrade(trade(["qbA2", "rbA"], ["rbB1"]), context);

    expect(result.teamA.addedFreeAgents).toHaveLength(1); // A: 3 players → 2, so one free agent
    expect(result.teamB.droppedPlayers).toEqual(["qbB"]); // B: 4 players, qbB now sits behind qbA2
    expect(result.reasons).toHaveLength(4);
    expect(result.reasons[3]).toMatchObject({ kind: "fills_open_spot", side: "a" });
  });

  it("doesn't fill a spot that was already open before the trade", () => {
    // A only has 2 players (limit 3). A 1-for-1 leaves it at 2, so no free agent is added:
    // A could have signed one without trading, so the trade shouldn't get credit for it.
    const shortHanded = makeRoster("A", ["qbA1", "rbA"], []);
    const result = evaluateTrade(trade(["rbA"], ["rbB2"]), makeContext([shortHanded, teamB]));

    expect(result.teamA.addedFreeAgents).toEqual([]);
    expect(result.teamA.weeklyGain).toBe(9); // RB 5 → 14, nothing else
  });

  it("ignores Sleeper's '0' empty-slot marker when counting roster spots", () => {
    const withEmptySlot = makeRoster("A", ["qbA1", "rbA", "0"], ["qbA2"]);
    const result = evaluateTrade(trade(["qbA2"], ["rbB2"]), makeContext([withEmptySlot, teamB]));

    expect(result.teamA.addedFreeAgents).toEqual([]);
    expect(result.teamA.weeklyGain).toBe(9);
  });

  it("allows one side to give nothing", () => {
    const result = evaluateTrade(trade(["qbA2"], []), context);

    expect(result.teamB.droppedPlayers).toHaveLength(1); // B receives one player with a full roster
    expect(result.teamA.marketValueReceived).toBe(0);
  });

  describe("player weekly points", () => {
    it("lists every rostered player's points per remaining week", () => {
      const result = evaluateTrade(trade(["qbA2"], ["rbB2"]), context);

      expect(result.weeks).toEqual([10, 11]);
      expect(Object.keys(result.playerWeeklyPoints).sort()).toEqual(
        ["qbA1", "qbA2", "qbB", "rbA", "rbB1", "rbB2"].sort()
      );
      expect(result.playerWeeklyPoints.rbB2).toEqual([14, 14]);
    });

    it("includes added free agents", () => {
      const result = evaluateTrade(trade(["qbA2", "rbA"], ["rbB1"]), context);
      const [added] = result.teamA.addedFreeAgents;

      expect(result.playerWeeklyPoints[added]).toHaveLength(2);
    });

    it("marks a week with no projection as null, unlike a projected 0", () => {
      const week10 = new Map(Object.entries(POINTS).map(([id, [, pts]]) => [id, pts]));
      const week11 = new Map(week10);
      week11.delete("qbA1"); // bye
      week11.set("rbA", 0); // projected but unavailable
      const result = evaluateTrade(trade(["qbA2"], ["rbB2"]), {
        ...context,
        weeklyPoints: new Map([
          [11, week11],
          [10, week10],
        ]),
      });

      expect(result.weeks).toEqual([10, 11]); // ascending, whatever the map order
      expect(result.playerWeeklyPoints.qbA1).toEqual([20, null]);
      expect(result.playerWeeklyPoints.rbA).toEqual([5, 0]);
    });
  });

  describe("guards", () => {
    it("rejects a player on both sides", () => {
      expect(() => evaluateTrade(trade(["qbA2"], ["qbA2"]), context)).toThrow("both sides");
    });

    it("rejects a player the giving team doesn't have", () => {
      expect(() => evaluateTrade(trade(["rbB1"], []), context)).toThrow("Team A can't trade");
    });

    it("rejects the same team on both sides", () => {
      const sameTeam = { teamA: { rosterId: "A", gives: [] }, teamB: { rosterId: "A", gives: [] } };
      expect(() => evaluateTrade(sameTeam, context)).toThrow("two different teams");
    });

    it("rejects a roster that isn't in the league", () => {
      const unknown = { ...trade([], []), teamB: { rosterId: "Z", gives: [] } };
      expect(() => evaluateTrade(unknown, context)).toThrow("Roster Z");
    });

    it("rejects evaluating with no remaining weeks", () => {
      expect(() => evaluateTrade(trade([], []), { ...context, weeklyPoints: new Map() })).toThrow(
        "No remaining weeks"
      );
    });
  });
});
