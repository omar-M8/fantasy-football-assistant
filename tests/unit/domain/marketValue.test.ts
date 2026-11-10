import { describe, it, expect } from "vitest";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import {
  getFreeAgentIds,
  getRosterPlayerIds,
  getTopFreeAgents,
} from "@/domain/services/freeAgents";
import { getMarketValue, getReplacementPoints } from "@/domain/services/marketValue";

function makePlayer(id: string, position: Position): Player {
  return {
    playerId: id,
    firstName: "Test",
    lastName: id,
    fullName: `Test ${id}`,
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
  ids: Partial<Pick<Roster, "starterIds" | "benchIds" | "reserveIds">>
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
    starterIds: ids.starterIds ?? [],
    benchIds: ids.benchIds ?? [],
    reserveIds: ids.reserveIds ?? [],
  };
}

const players = new Map(
  [
    makePlayer("rostered-wr", "WR"),
    makePlayer("fa-wr-good", "WR"),
    makePlayer("fa-wr-ok", "WR"),
    makePlayer("fa-wr-zero", "WR"),
    makePlayer("fa-rb", "RB"),
  ].map((p) => [p.playerId, p])
);

const weeklyPoints = new Map([
  [
    10,
    new Map([
      ["rostered-wr", 15],
      ["fa-wr-good", 8],
      ["fa-wr-ok", 6],
      ["fa-rb", 7],
    ]),
  ],
  [
    11,
    new Map([
      ["rostered-wr", 4],
      ["fa-wr-good", 5],
      ["fa-wr-ok", 9],
      ["fa-rb", 7],
    ]),
  ],
  // week 12: rostered-wr on bye (missing)
  [
    12,
    new Map([
      ["fa-wr-good", 7],
      ["fa-wr-ok", 2],
      ["fa-rb", 7],
    ]),
  ],
]);

describe("getRosterPlayerIds", () => {
  it("combines starters, bench, and reserve, skipping Sleeper's '0' empty-slot marker", () => {
    const roster = makeRoster("1", { starterIds: ["a", "0"], benchIds: ["b"], reserveIds: ["c"] });

    expect(getRosterPlayerIds(roster)).toEqual(["a", "b", "c"]);
  });
});

describe("getFreeAgentIds", () => {
  it("returns players not on any roster", () => {
    const rosters = [makeRoster("1", { starterIds: ["rostered-wr"] })];

    expect(getFreeAgentIds(players, rosters)).not.toContain("rostered-wr");
    expect(getFreeAgentIds(players, rosters)).toContain("fa-wr-good");
  });
});

describe("getTopFreeAgents", () => {
  it("keeps the best N per position and skips free agents with no points", () => {
    const freeAgents = ["fa-wr-good", "fa-wr-ok", "fa-wr-zero", "fa-rb"];

    const top = getTopFreeAgents(freeAgents, players, weeklyPoints, 1);

    expect(top.sort()).toEqual(["fa-rb", "fa-wr-good"]); // fa-wr-good: 20 total vs fa-wr-ok: 17
  });
});

describe("getReplacementPoints / getMarketValue", () => {
  const freeAgents = ["fa-wr-good", "fa-wr-ok", "fa-wr-zero", "fa-rb"];
  const replacement = getReplacementPoints(freeAgents, players, weeklyPoints);

  it("uses the best free agent at the position each week", () => {
    expect([...(replacement.get("WR")?.values() ?? [])]).toEqual([8, 9, 7]);
    expect(replacement.get("RB")?.get(10)).toBe(7);
  });

  it("sums points above replacement, never counting a week below zero", () => {
    // week 10: 15 − 8 = 7; week 11: 4 − 9 → 0; week 12 (bye): 0 − 7 → 0
    expect(getMarketValue("rostered-wr", players, weeklyPoints, replacement)).toBe(7);
  });

  it("is 0 for a player not in the player map", () => {
    expect(getMarketValue("unknown", players, weeklyPoints, replacement)).toBe(0);
  });
});
