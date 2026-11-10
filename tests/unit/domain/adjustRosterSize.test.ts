import { describe, it, expect } from "vitest";
import type { Player, Position } from "@/domain/entities/Player";
import { adjustRosterSize, type RosterSizeInput } from "@/domain/services/adjustRosterSize";

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

const players = new Map(
  [
    makePlayer("qb", "QB"),
    makePlayer("qb2", "QB"),
    makePlayer("rb", "RB"),
    makePlayer("rb-bench", "RB"),
    makePlayer("ir-rb", "RB"),
    makePlayer("fa-qb", "QB"),
    makePlayer("fa-rb", "RB"),
  ].map((p) => [p.playerId, p])
);

/** One week is enough here: the logic only compares team totals. */
const weeklyPoints = new Map([
  [
    10,
    new Map([
      ["qb", 20],
      ["qb2", 12],
      ["rb", 15],
      ["rb-bench", 6],
      ["ir-rb", 0],
      ["fa-qb", 18], // scores more than fa-rb, but would only sit behind "qb"
      ["fa-rb", 9],
    ]),
  ],
]);

function input(overrides: Partial<RosterSizeInput>): RosterSizeInput {
  return {
    rosterPositions: ["QB", "RB", "BN"], // limit: 3 non-reserve players
    playerIds: [],
    reserveIds: new Set(),
    fillTo: 3,
    candidateIds: ["fa-qb", "fa-rb"],
    players,
    weeklyPoints,
    ...overrides,
  };
}

describe("adjustRosterSize", () => {
  it("fills a trade-opened spot with the free agent who adds the most value, not the top scorer", () => {
    // Team traded away its RB starter: fa-rb (9) starts, fa-qb (18) would only sit on the bench
    const result = adjustRosterSize(input({ playerIds: ["qb", "qb2"] }));

    expect(result.added).toEqual(["fa-rb"]);
    expect(result.playerIds).toContain("fa-rb");
  });

  it("drops the player the team misses least when over the limit", () => {
    const result = adjustRosterSize(input({ playerIds: ["qb", "qb2", "rb", "rb-bench"] }));

    // qb2 and rb-bench both sit on the bench (cost 0); the earlier one in the list is dropped
    expect(result.dropped).toEqual(["qb2"]);
    expect(result.playerIds).toEqual(["qb", "rb", "rb-bench"]);
  });

  it("leaves a full, legal roster alone", () => {
    const result = adjustRosterSize(input({ playerIds: ["qb", "rb", "rb-bench"] }));

    expect(result).toEqual({ playerIds: ["qb", "rb", "rb-bench"], added: [], dropped: [] });
  });

  it("doesn't count reserve players toward the limit", () => {
    const result = adjustRosterSize(
      input({ playerIds: ["qb", "rb", "rb-bench", "ir-rb"], reserveIds: new Set(["ir-rb"]) })
    );

    expect(result.dropped).toEqual([]);
  });

  it("only fills spots the trade opened (up to fillTo)", () => {
    // The team was already one short before the trade, so nothing is added
    const result = adjustRosterSize(input({ playerIds: ["qb", "rb"], fillTo: 2 }));

    expect(result.added).toEqual([]);
  });

  it("stops filling when there are no candidates left", () => {
    const result = adjustRosterSize(input({ playerIds: ["qb"], candidateIds: ["fa-rb"] }));

    expect(result.added).toEqual(["fa-rb"]);
    expect(result.playerIds).toHaveLength(2);
  });
});
