import { describe, it, expect } from "vitest";
import { parseLineup } from "@/domain/services/SlotParser";
import type { Player } from "@/domain/entities/Player";

/** Helper to build a fake player with just the fields we care about. */
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

// Helper to build a map of playerId to Player for testing
function makePlayerMap(...players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.playerId, p]));
}

describe("parseLineup", () => {
  it("zips roster positions with starter IDs", () => {
    const players = makePlayerMap(
      makePlayer("qb1", "QB"),
      makePlayer("rb1", "RB"),
      makePlayer("wr1", "WR")
    );

    const result = parseLineup(["QB", "RB", "WR"], ["qb1", "rb1", "wr1"], players);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ slotType: "QB", playerId: "qb1", position: "QB" });
    expect(result[1]).toEqual({ slotType: "RB", playerId: "rb1", position: "RB" });
    expect(result[2]).toEqual({ slotType: "WR", playerId: "wr1", position: "WR" });
  });

  it("resolves FLEX slot to the player's actual position", () => {
    const players = makePlayerMap(
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB"),
      makePlayer("wr1", "WR"),
      makePlayer("flex_rb", "RB")
    );

    const result = parseLineup(["RB", "WR", "FLEX"], ["rb1", "wr1", "flex_rb"], players);

    expect(result[2]).toEqual({
      slotType: "FLEX",
      playerId: "flex_rb",
      position: "RB",
    });
  });

  it('treats Sleeper\'s "0" placeholder as an empty slot', () => {
    const players = makePlayerMap(makePlayer("qb1", "QB"));

    const result = parseLineup(["QB", "RB"], ["qb1", "0"], players);

    expect(result[1]).toEqual({ slotType: "RB", playerId: null, position: null });
  });

  it("treats missing starter IDs as empty slots", () => {
    const players = makePlayerMap(makePlayer("qb1", "QB"));

    const result = parseLineup(["QB", "RB", "WR"], ["qb1"], players);

    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ slotType: "RB", playerId: null, position: null });
    expect(result[2]).toEqual({ slotType: "WR", playerId: null, position: null });
  });

  it("skips bench slots", () => {
    const players = makePlayerMap(makePlayer("qb1", "QB"));

    const result = parseLineup(["QB", "BN", "BN", "BN"], ["qb1", "0", "0", "0"], players);

    expect(result).toHaveLength(1);
    expect(result[0].slotType).toBe("QB");
  });

  it("throws on unknown slot types", () => {
    const players = makePlayerMap();

    expect(() => parseLineup(["QB", "WEIRD_SLOT"], ["qb1", "x"], players)).toThrow(
      'Unknown slot type: "WEIRD_SLOT"'
    );
  });

  it("handles multiple FLEX slots independently", () => {
    const players = makePlayerMap(
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB"),
      makePlayer("wr1", "WR"),
      makePlayer("wr2", "WR"),
      makePlayer("flex1", "RB"),
      makePlayer("flex2", "WR")
    );

    const result = parseLineup(
      ["RB", "RB", "WR", "WR", "FLEX", "FLEX"],
      ["rb1", "rb2", "wr1", "wr2", "flex1", "flex2"],
      players
    );

    expect(result).toHaveLength(6);
    expect(result[4]).toEqual({ slotType: "FLEX", playerId: "flex1", position: "RB" });
    expect(result[5]).toEqual({ slotType: "FLEX", playerId: "flex2", position: "WR" });
  });
});
