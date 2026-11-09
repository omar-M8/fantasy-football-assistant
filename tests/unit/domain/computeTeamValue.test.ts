import { describe, it, expect } from "vitest";
import type { Player, Position } from "@/domain/entities/Player";
import { computeTeamValue } from "@/domain/services/computeTeamValue";

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

function makePlayerMap(...players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.playerId, p]));
}

/**
 * Builds week → (playerId → points). Leaving a player out of a week means
 * "no points that week", the same way getAvailablePoints reports a bye or injury.
 */
function makeWeeklyPoints(
  weeks: Record<number, Record<string, number>>
): Map<number, Map<string, number>> {
  return new Map(
    Object.entries(weeks).map(([week, points]) => [Number(week), new Map(Object.entries(points))])
  );
}

/** The player started in the first slot of the given slot type that week. */
function starterIn(
  result: ReturnType<typeof computeTeamValue>,
  week: number,
  slotType: string
): string | null | undefined {
  return result.byWeek.find((w) => w.week === week)?.lineup.find((s) => s.slotType === slotType)
    ?.playerId;
}

describe("computeTeamValue", () => {
  // ── Golden tests from the plan ────────────────────────────────────────────

  it("starts the backup during the starter's bye week, and the backup adds value", () => {
    const players = makePlayerMap(makePlayer("star", "QB"), makePlayer("backup", "QB"));
    const weeklyPoints = makeWeeklyPoints({
      10: { star: 20, backup: 10 },
      11: { backup: 10 }, // star on bye: missing from the week
      12: { star: 20, backup: 10 },
    });

    const result = computeTeamValue(["QB", "BN"], ["star", "backup"], players, weeklyPoints);

    expect(starterIn(result, 11, "QB")).toBe("backup");
    expect(result.byWeek.map((w) => w.points)).toEqual([20, 10, 20]);
    expect(result.total).toBe(50); // the backup's 10 counts; a season-long lineup would give him 0
  });

  it("counts an injured player only from the week he's projected to return", () => {
    // Weekly projections reflect return dates: Sleeper omits an IR player until he's due back
    // (Lamar Jackson had nothing in weeks 9-13 and 19.78 in week 14).
    const players = makePlayerMap(makePlayer("injured", "RB"), makePlayer("depth", "RB"));
    const weeklyPoints = makeWeeklyPoints({
      10: { depth: 8 },
      11: { depth: 8 },
      12: { injured: 18, depth: 8 },
      13: { injured: 18, depth: 8 },
    });

    const result = computeTeamValue(["RB", "BN"], ["injured", "depth"], players, weeklyPoints);

    expect(result.byWeek.map((w) => starterIn(result, w.week, "RB"))).toEqual([
      "depth",
      "depth",
      "injured",
      "injured",
    ]);
    expect(result.total).toBe(8 + 8 + 18 + 18);
  });

  it("gives a surplus 6th WR who never starts no value", () => {
    const wrIds = ["wr1", "wr2", "wr3", "wr4", "wr5", "wr6"];
    const players = makePlayerMap(...wrIds.map((id) => makePlayer(id, "WR")));
    const rosterPositions = ["WR", "WR", "WR", "WR", "FLEX", "BN"]; // 5 WR-eligible slots
    const weeklyPoints = makeWeeklyPoints({
      10: { wr1: 15, wr2: 14, wr3: 13, wr4: 12, wr5: 11, wr6: 5 },
    });

    const withSixth = computeTeamValue(rosterPositions, wrIds, players, weeklyPoints);
    const withoutSixth = computeTeamValue(
      rosterPositions,
      wrIds.slice(0, 5),
      players,
      weeklyPoints
    );

    expect(withSixth.byWeek[0].lineup.map((s) => s.playerId)).not.toContain("wr6");
    expect(withSixth.total).toBe(withoutSixth.total);
  });

  it("handles a slot no one can fill without crashing", () => {
    const players = makePlayerMap(makePlayer("qb", "QB"));
    const weeklyPoints = makeWeeklyPoints({ 10: { qb: 20 } });

    const result = computeTeamValue(["QB", "K"], ["qb"], players, weeklyPoints);

    expect(result.byWeek[0].lineup).toContainEqual({
      slotType: "K",
      playerId: null,
      position: null,
    });
    expect(result.total).toBe(20); // the empty K slot adds nothing
  });

  // ── Supporting behaviour ──────────────────────────────────────────────────

  it("counts bench players only when they start", () => {
    const players = makePlayerMap(makePlayer("starter", "TE"), makePlayer("bench", "TE"));
    const weeklyPoints = makeWeeklyPoints({ 10: { starter: 12, bench: 9 } });

    const result = computeTeamValue(["TE", "BN"], ["starter", "bench"], players, weeklyPoints);

    expect(result.total).toBe(12); // not 21: the bench player's 9 doesn't count
  });

  it("lists weeks in order even if the map wasn't built in order", () => {
    const players = makePlayerMap(makePlayer("qb", "QB"));
    const weeklyPoints = new Map([
      [12, new Map([["qb", 3]])],
      [10, new Map([["qb", 1]])],
      [11, new Map([["qb", 2]])],
    ]);

    const result = computeTeamValue(["QB"], ["qb"], players, weeklyPoints);

    expect(result.byWeek.map((w) => [w.week, w.points])).toEqual([
      [10, 1],
      [11, 2],
      [12, 3],
    ]);
  });

  it("returns zero when there are no weeks left", () => {
    const players = makePlayerMap(makePlayer("qb", "QB"));

    const result = computeTeamValue(["QB"], ["qb"], players, new Map());

    expect(result).toEqual({ total: 0, byWeek: [] });
  });
});
