import { describe, it, expect } from "vitest";
import type { WeeklyTeamValue } from "@/domain/entities/TeamValue";
import type { TeamTradeImpact } from "@/domain/entities/Trade";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import {
  findByeWeeksCovered,
  getRegularStarterThreshold,
} from "@/domain/services/buildTradeReasons";

const WEEKS = [10, 11, 12, 13];

/** week → starter IDs (RB, FLEX), turned into WeeklyTeamValue entries. */
function lineups(starters: Record<number, string[]>): WeeklyTeamValue[] {
  return Object.keys(starters)
    .map(Number)
    .map((week) => ({
      week,
      points: 0,
      lineup: starters[week].map((playerId, i) => ({
        slotType: i === 0 ? "RB" : "FLEX",
        playerId,
        position: "RB",
      })),
    }));
}

function impact(
  before: Record<number, string[]>,
  after: Record<number, string[]>
): TeamTradeImpact {
  return {
    rosterId: "A",
    valueBefore: 0,
    valueAfter: 0,
    weeklyGain: 0,
    marketValueSent: 0,
    marketValueReceived: 0,
    lineupBefore: lineups(before),
    lineupAfter: lineups(after),
    addedFreeAgents: [],
    droppedPlayers: [],
  };
}

/** Everyone is projected every week, except the listed (week, player) byes. */
function points(byes: [number, string][] = [], weeks = WEEKS): WeeklyPoints {
  const ids = ["rb1", "wr1", "bench", "newRb"];
  return new Map(
    weeks.map((week) => [
      week,
      new Map(
        ids.filter((id) => !byes.some(([w, b]) => w === week && b === id)).map((id) => [id, 10])
      ),
    ])
  );
}

describe("getRegularStarterThreshold", () => {
  it.each([
    [5, 3],
    [8, 3], // capped at 3
    [4, 2],
    [3, 2],
    [2, 1],
    [1, 1],
  ])("%i remaining weeks → %i starts", (weeks, threshold) => {
    expect(getRegularStarterThreshold(weeks)).toBe(threshold);
  });
});

describe("findByeWeeksCovered", () => {
  // rb1 starts weeks 10, 11, 13 (a regular) and is on bye in 12, where the bench player filled in.
  const before = {
    10: ["rb1", "wr1"],
    11: ["rb1", "wr1"],
    12: ["bench", "wr1"],
    13: ["rb1", "wr1"],
  };

  it("returns the week a received player fills in for a regular starter on bye", () => {
    const after = { ...before, 12: ["newRb", "wr1"] };
    expect(findByeWeeksCovered("newRb", impact(before, after), points([[12, "rb1"]]))).toEqual([
      12,
    ]);
  });

  it("counts a FLEX fill-in", () => {
    const after = { ...before, 12: ["bench", "newRb"] };
    expect(findByeWeeksCovered("newRb", impact(before, after), points([[12, "rb1"]]))).toEqual([
      12,
    ]);
  });

  it("returns nothing for a player who starts every week", () => {
    const after = {
      10: ["rb1", "newRb"],
      11: ["rb1", "newRb"],
      12: ["newRb", "wr1"],
      13: ["rb1", "newRb"],
    };
    expect(findByeWeeksCovered("newRb", impact(before, after), points([[12, "rb1"]]))).toEqual([]);
  });

  it("returns nothing when no regular starter is on bye", () => {
    const after = { ...before, 12: ["newRb", "wr1"] };
    expect(findByeWeeksCovered("newRb", impact(before, after), points())).toEqual([]);
  });

  it("ignores a bye for someone who isn't a regular starter", () => {
    const after = { ...before, 12: ["newRb", "wr1"] };
    // "bench" started once, so its bye in week 12 doesn't count.
    expect(findByeWeeksCovered("newRb", impact(before, after), points([[12, "bench"]]))).toEqual(
      []
    );
  });

  it("finds a regular starter on bye with only 3 weeks left (2 starts is enough)", () => {
    const weeks = [12, 13, 14];
    const shortBefore = { 12: ["rb1", "wr1"], 13: ["bench", "wr1"], 14: ["rb1", "wr1"] };
    const shortAfter = { ...shortBefore, 13: ["newRb", "wr1"] };

    expect(
      findByeWeeksCovered("newRb", impact(shortBefore, shortAfter), points([[13, "rb1"]], weeks))
    ).toEqual([13]);
  });
});
