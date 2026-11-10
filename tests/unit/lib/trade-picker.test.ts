import { describe, it, expect } from "vitest";
import type { NflTeam, Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import { buildTradeHref, buildTradePickerData, toggleId } from "@/lib/trade-picker";

function makePlayer(id: string, name: string, position: Position, team: NflTeam | null): Player {
  return {
    playerId: id,
    firstName: "",
    lastName: name,
    fullName: name,
    age: 25,
    team,
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

const players = new Map([
  ["1", makePlayer("1", "Zed Wideout", "WR", "KC")],
  ["2", makePlayer("2", "Amy Wideout", "WR", "BUF")],
  ["3", makePlayer("3", "Quinn Passer", "QB", null)],
  ["4", makePlayer("4", "Rory Runner", "RB", "SF")],
]);

describe("buildTradePickerData", () => {
  const rosters = [makeRoster("1", ["1", "0", "3"], ["2"], ["4"]), makeRoster("2", ["99"], [])];

  it("sorts my players by position then name, keeps reserves, and skips empty slots", () => {
    const data = buildTradePickerData(rosters, players, "1");

    expect(data.me.players.map((p) => p.name)).toEqual([
      "Quinn Passer",
      "Rory Runner",
      "Amy Wideout",
      "Zed Wideout",
    ]);
    expect(data.me.players[0]).toEqual({
      id: "3",
      name: "Quinn Passer",
      position: "QB",
      nflTeam: null,
    });
  });

  it("lists every other team as a partner and skips unknown player IDs", () => {
    const data = buildTradePickerData(rosters, players, "1");

    expect(data.partners).toEqual([{ rosterId: "2", teamName: "Team 2", players: [] }]);
  });

  it("throws if my roster isn't in the league", () => {
    expect(() => buildTradePickerData(rosters, players, "7")).toThrow("Roster 7");
  });
});

describe("buildTradeHref", () => {
  it.each([
    [{ partner: null, give: [], get: [] }, "/trades"],
    [{ partner: "3", give: [], get: [] }, "/trades?partner=3"],
    [
      { partner: "3", give: ["4046", "6794"], get: ["KC"] },
      "/trades?partner=3&give=4046,6794&get=KC",
    ],
    [{ partner: null, give: ["1"], get: [] }, "/trades?give=1"],
  ])("%o → %s", (draft, href) => {
    expect(buildTradeHref(draft)).toBe(href);
  });
});

describe("toggleId", () => {
  it("adds a missing ID at the end and removes a present one", () => {
    expect(toggleId(["1", "2"], "3")).toEqual(["1", "2", "3"]);
    expect(toggleId(["1", "2", "3"], "2")).toEqual(["1", "3"]);
  });
});
