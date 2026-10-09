import { describe, it, expect } from "vitest";
import { buildOptimalLineup } from "@/domain/services/BuildOptimalLineup";
import type { Player } from "@/domain/entities/Player";

function makePlayer(id: string, position: Player["position"]): Player {
  return {
    playerId: id,
    firstName: "Test",
    lastName: "Player",
    fullName: "Test Player",
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

function makePlayerMap(...players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.playerId, p]));
}

function makePoints(entries: [string, number][]): Map<string, number> {
  return new Map(entries);
}

describe("buildOptimalLineup", () => {
  it("fills dedicated slots with highest-projected eligible players", () => {
    const players = makePlayerMap(
      makePlayer("qb1", "QB"),
      makePlayer("qb2", "QB"),
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB")
    );
    const points = makePoints([
      ["qb1", 300],
      ["qb2", 250],
      ["rb1", 200],
      ["rb2", 180],
    ]);

    const lineup = buildOptimalLineup(["QB", "RB"], ["qb1", "qb2", "rb1", "rb2"], players, points);

    expect(lineup).toHaveLength(2);
    expect(lineup[0]).toEqual({ slotType: "QB", playerId: "qb1", position: "QB" });
    expect(lineup[1]).toEqual({ slotType: "RB", playerId: "rb1", position: "RB" });
  });

  it("fills FLEX with the best remaining eligible player", () => {
    const players = makePlayerMap(
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB"),
      makePlayer("wr1", "WR")
    );
    const points = makePoints([
      ["rb1", 200],
      ["rb2", 150],
      ["wr1", 180],
    ]);

    const lineup = buildOptimalLineup(["RB", "FLEX"], ["rb1", "rb2", "wr1"], players, points);

    expect(lineup[1].slotType).toBe("FLEX");
    expect(lineup[1].playerId).toBe("wr1"); // 180 > 150
  });

  it("fills dedicated slots before flex — even if FLEX would take a higher-projected player", () => {
    const players = makePlayerMap(
      makePlayer("rb1", "RB"),
      makePlayer("wr1", "WR"),
      makePlayer("wr2", "WR")
    );
    const points = makePoints([
      ["rb1", 200],
      ["wr1", 150],
      ["wr2", 120],
    ]);

    const lineup = buildOptimalLineup(["RB", "WR", "FLEX"], ["rb1", "wr1", "wr2"], players, points);

    // If FLEX ran first, it would take rb1 (200), leaving RB slot empty.
    // Correct behavior: RB slot gets rb1, WR slot gets wr1, FLEX gets wr2.
    expect(lineup[0]).toEqual({ slotType: "RB", playerId: "rb1", position: "RB" });
    expect(lineup[1]).toEqual({ slotType: "WR", playerId: "wr1", position: "WR" });
    expect(lineup[2]).toEqual({ slotType: "FLEX", playerId: "wr2", position: "WR" });
  });

  it("fills multiple FLEX slots independently", () => {
    const players = makePlayerMap(
      makePlayer("rb1", "RB"),
      makePlayer("wr1", "WR"),
      makePlayer("wr2", "WR"),
      makePlayer("te1", "TE")
    );
    const points = makePoints([
      ["rb1", 200],
      ["wr1", 150],
      ["wr2", 140],
      ["te1", 130],
    ]);

    const lineup = buildOptimalLineup(
      ["RB", "FLEX", "FLEX"],
      ["rb1", "wr1", "wr2", "te1"],
      players,
      points
    );

    expect(lineup[1].playerId).toBe("wr1"); // 150
    expect(lineup[2].playerId).toBe("wr2"); // 140
  });

  it("returns empty slots when no eligible player exists", () => {
    const players = makePlayerMap(makePlayer("wr1", "WR"), makePlayer("wr2", "WR"));
    const points = makePoints([
      ["wr1", 150],
      ["wr2", 140],
    ]);

    const lineup = buildOptimalLineup(["QB", "WR"], ["wr1", "wr2"], players, points);

    expect(lineup[0]).toEqual({ slotType: "QB", playerId: null, position: null });
    expect(lineup[1]).toEqual({ slotType: "WR", playerId: "wr1", position: "WR" });
  });

  it("skips bench slots", () => {
    const players = makePlayerMap(makePlayer("qb1", "QB"));
    const points = makePoints([["qb1", 300]]);

    const lineup = buildOptimalLineup(["QB", "BN", "BN"], ["qb1"], players, points);

    expect(lineup).toHaveLength(1);
    expect(lineup[0].slotType).toBe("QB");
  });
});
