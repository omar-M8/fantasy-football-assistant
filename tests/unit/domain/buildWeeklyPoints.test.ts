import { describe, it, expect } from "vitest";
import type { InjuryStatus, Player } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { buildWeeklyPoints } from "@/domain/services/buildWeeklyPoints";

function makePlayer(id: string, injuryStatus: InjuryStatus | null = null): Player {
  return {
    playerId: id,
    firstName: "Test",
    lastName: id,
    fullName: `Test ${id}`,
    age: 25,
    team: null,
    position: "WR",
    height: "6'0\"",
    weight: 200,
    injuryStatus,
    status: "active",
    number: null,
  };
}

function projection(playerId: string, ppr: number): PlayerProjection {
  return { playerId, pointsPpr: ppr, pointsHalfPpr: ppr - 1, pointsStd: ppr - 2 };
}

describe("buildWeeklyPoints", () => {
  const players = new Map([
    ["wr", makePlayer("wr")],
    ["out", makePlayer("out", "Out")],
  ]);

  const weeklyProjections = new Map([
    [
      9,
      new Map([
        ["wr", projection("wr", 15)],
        ["out", projection("out", 12)],
      ]),
    ],
    [
      10,
      new Map([
        ["wr", projection("wr", 16)],
        ["out", projection("out", 13)],
        ["idp-linebacker", projection("idp-linebacker", 9)], // not a fantasy player
      ]),
    ],
  ]);

  it("applies getAvailablePoints per player per week, in the league's format", () => {
    const result = buildWeeklyPoints(players, weeklyProjections, 9, "half_ppr");

    expect(result.get(9)?.get("wr")).toBe(14);
    expect(result.get(10)?.get("wr")).toBe(15);
  });

  it("zeroes a sidelined player in the current week only", () => {
    const result = buildWeeklyPoints(players, weeklyProjections, 9, "ppr");

    expect(result.get(9)?.get("out")).toBe(0);
    expect(result.get(10)?.get("out")).toBe(13);
  });

  it("skips projections for players outside the fantasy player map", () => {
    const result = buildWeeklyPoints(players, weeklyProjections, 9, "ppr");

    expect(result.get(10)?.has("idp-linebacker")).toBe(false);
  });
});
