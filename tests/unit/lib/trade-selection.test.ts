import { describe, it, expect } from "vitest";
import type { Player } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import { findTradeProblem } from "@/lib/trade-selection";

function makeRoster(rosterId: string, teamName: string, starterIds: string[]): Roster {
  return {
    rosterId,
    ownerId: `owner-${rosterId}`,
    teamName,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    starterIds,
    benchIds: [],
    reserveIds: [],
  };
}

const players = new Map(
  [
    ["1", "Patrick Mahomes"],
    ["2", "Bijan Robinson"],
    ["3", "Puka Nacua"],
  ].map(([id, fullName]) => [id, { fullName } as Player])
);

const mine = makeRoster("1", "My Team", ["1", "2"]);
const theirs = makeRoster("2", "Rival FC", ["3"]);

describe("findTradeProblem", () => {
  it("returns null for a valid trade", () => {
    const trade = { partner: "2", give: ["1"], get: ["3"] };

    expect(findTradeProblem(trade, mine, theirs, players)).toBeNull();
  });

  it("rejects trading with yourself", () => {
    const trade = { partner: "1", give: ["1"], get: [] };

    expect(findTradeProblem(trade, mine, mine, players)).toBe(
      "Pick a trade partner other than your own team."
    );
  });

  it("names a player on both sides", () => {
    const trade = { partner: "2", give: ["1"], get: ["1"] };

    expect(findTradeProblem(trade, mine, theirs, players)).toBe(
      "Patrick Mahomes can't be on both sides of the trade."
    );
  });

  it("names players you're sending but don't have", () => {
    const trade = { partner: "2", give: ["3"], get: [] };

    expect(findTradeProblem(trade, mine, theirs, players)).toBe(
      "Puka Nacua is not on your roster."
    );
  });

  it("names players you're asking for that the partner doesn't have, using 'are' for several", () => {
    const trade = { partner: "2", give: [], get: ["1", "2"] };

    expect(findTradeProblem(trade, mine, theirs, players)).toBe(
      "Patrick Mahomes, Bijan Robinson are not on Rival FC's roster."
    );
  });

  it("falls back to the ID for an unknown player", () => {
    const trade = { partner: "2", give: ["999"], get: [] };

    expect(findTradeProblem(trade, mine, theirs, players)).toBe(
      "Player 999 is not on your roster."
    );
  });
});
