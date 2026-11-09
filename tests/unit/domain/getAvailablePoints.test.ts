import { describe, it, expect } from "vitest";
import type { InjuryStatus, Player } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { getAvailablePoints } from "@/domain/services/getAvailablePoints";

/** Builds a fake player. Only `injuryStatus` matters to getAvailablePoints. */
function makePlayer(injuryStatus: InjuryStatus | null = null): Player {
  return {
    playerId: "1",
    firstName: "Test",
    lastName: "Player",
    fullName: "Test Player",
    age: 25,
    team: "KC",
    position: "WR",
    height: "6'0\"",
    weight: 200,
    injuryStatus,
    status: "active",
    number: null,
  };
}

/**
 * Each format has a different value, so a test can only pass if the function
 * picked the right one. If all three were 20, a format mix-up would go unnoticed.
 */
const PROJECTION: PlayerProjection = {
  playerId: "1",
  pointsPpr: 20,
  pointsHalfPpr: 17,
  pointsStd: 14,
};

const CURRENT_WEEK = 9;

describe("getAvailablePoints", () => {
  describe("rule 1: no projection", () => {
    it("returns 0 when the week has no projection, which is how byes appear", () => {
      expect(getAvailablePoints(makePlayer(), 10, CURRENT_WEEK, undefined, "ppr")).toBe(0);
    });

    it("returns 0 for a sidelined player with no projection", () => {
      expect(getAvailablePoints(makePlayer("IR"), 10, CURRENT_WEEK, undefined, "ppr")).toBe(0);
    });
  });

  describe("rule 2: sidelined players in the current week", () => {
    it.each<InjuryStatus>(["Out", "IR", "PUP", "Sus"])(
      "returns 0 for a %s player in the current week, even with a projection",
      (status) => {
        const points = getAvailablePoints(
          makePlayer(status),
          CURRENT_WEEK,
          CURRENT_WEEK,
          PROJECTION,
          "ppr"
        );

        expect(points).toBe(0);
      }
    );

    it("trusts the projection for a sidelined player in a later week", () => {
      const points = getAvailablePoints(makePlayer("IR"), 14, CURRENT_WEEK, PROJECTION, "ppr");

      expect(points).toBe(20);
    });

    it("trusts the projection for a sidelined player in an earlier week", () => {
      const points = getAvailablePoints(makePlayer("Out"), 3, CURRENT_WEEK, PROJECTION, "ppr");

      expect(points).toBe(20);
    });
  });

  describe("rule 3: available players", () => {
    it.each<InjuryStatus>(["Questionable", "Doubtful"])(
      "counts a %s player's projection in the current week",
      (status) => {
        const points = getAvailablePoints(
          makePlayer(status),
          CURRENT_WEEK,
          CURRENT_WEEK,
          PROJECTION,
          "ppr"
        );

        expect(points).toBe(20);
      }
    );

    it("counts a healthy player's projection in the current week", () => {
      const points = getAvailablePoints(
        makePlayer(null),
        CURRENT_WEEK,
        CURRENT_WEEK,
        PROJECTION,
        "ppr"
      );

      expect(points).toBe(20);
    });

    it.each([
      ["ppr", 20],
      ["half_ppr", 17],
      ["standard", 14],
    ] as const)("uses the %s value for that scoring format", (format, expected) => {
      expect(getAvailablePoints(makePlayer(), 10, CURRENT_WEEK, PROJECTION, format)).toBe(expected);
    });

    // Sleeper sends statuses outside the InjuryStatus union. Until the TODO in Player.ts is
    // handled, they count as available. This test pins that behaviour so changing it is a
    // deliberate decision rather than an accident.
    it.each(["NA", "COV", "DNR"])("treats the unhandled %s status as available", (status) => {
      const player = makePlayer(status as InjuryStatus);

      expect(getAvailablePoints(player, CURRENT_WEEK, CURRENT_WEEK, PROJECTION, "ppr")).toBe(20);
    });
  });
});
