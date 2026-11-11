import { describe, it, expect } from "vitest";
import type { Roster } from "@/domain/entities/Roster";
import { buildTeamChoices } from "@/lib/team-choices";

function makeRoster(ownerId: string, teamName: string, record: [number, number, number]): Roster {
  return {
    rosterId: ownerId,
    ownerId,
    teamName,
    wins: record[0],
    losses: record[1],
    ties: record[2],
    pointsFor: 0,
    pointsAgainst: 0,
    starterIds: [],
    benchIds: [],
    reserveIds: [],
  };
}

describe("buildTeamChoices", () => {
  it("joins each roster to its owner, in roster order, and skips ownerless teams", () => {
    const rosters = [
      makeRoster("2", "Chig-ers", [7, 3, 0]),
      makeRoster("1", "Pukie Bears", [5, 4, 1]),
      makeRoster("9", "Orphans", [0, 10, 0]),
    ];
    const users = [
      { userId: "1", displayName: "omar", avatarId: null },
      { userId: "2", displayName: "sam", avatarId: "abc" },
    ];

    expect(buildTeamChoices(rosters, users)).toEqual([
      { userId: "2", teamName: "Chig-ers", ownerName: "sam", avatarId: "abc", record: "7-3" },
      { userId: "1", teamName: "Pukie Bears", ownerName: "omar", avatarId: null, record: "5-4-1" },
    ]);
  });
});
