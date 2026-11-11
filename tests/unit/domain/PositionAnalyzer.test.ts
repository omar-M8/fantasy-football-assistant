import { describe, it, expect } from "vitest";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { League, ScoringFormat } from "@/domain/entities/League";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import { buildSeasonPoints } from "@/domain/services/buildSeasonPoints";

// ============================================================================
// Test helpers
// ============================================================================

function makePlayer(id: string, position: Position): Player {
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

function makeRoster(
  rosterId: string,
  playerIds: { starters?: string[]; bench?: string[]; reserve?: string[] }
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
    starterIds: playerIds.starters ?? [],
    benchIds: playerIds.bench ?? [],
    reserveIds: playerIds.reserve ?? [],
  };
}

function makeLeague(
  rosterPositions: string[],
  scoringFormat: ScoringFormat,
  teamCount: number
): League {
  return {
    leagueId: "test-league",
    name: "Test League",
    season: "2026",
    currentWeek: 1,
    teamCount,
    settings: { scoringFormat, rosterPositions },
  };
}

function makeProjection(
  playerId: string,
  ppr: number,
  halfPpr: number = ppr,
  std: number = ppr
): PlayerProjection {
  return { playerId, pointsPpr: ppr, pointsHalfPpr: halfPpr, pointsStd: std };
}

function toPlayerMap(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.playerId, p]));
}

function toProjectionMap(projections: PlayerProjection[]): Map<string, PlayerProjection> {
  return new Map(projections.map((p) => [p.playerId, p]));
}

/**
 * The same points in each of `weeks` (default: two remaining weeks). Per-week averages then
 * equal these numbers, so the expected values read the same as the old season-total ones.
 */
function everyWeek(points: Record<string, number>, weeks: number[] = [10, 11]): WeeklyPoints {
  const week = new Map(Object.entries(points));
  return new Map(weeks.map((w) => [w, week]));
}

/** Different points per week: { 10: { rb1: 20 }, 11: { rb1: 0 } }. A missing player is on bye. */
function byWeek(weeks: Record<number, Record<string, number>>): WeeklyPoints {
  return new Map(
    Object.entries(weeks).map(([w, pts]) => [Number(w), new Map(Object.entries(pts))])
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("analyzePosition", () => {
  it("ranks teams by starter value when there are no free agents", () => {
    const players = toPlayerMap([makePlayer("rb_elite", "RB"), makePlayer("rb_weak", "RB")]);
    const weeklyPoints = everyWeek({ rb_elite: 300, rb_weak: 100 });
    const league = makeLeague(["RB"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb_elite"] }),
      makeRoster("B", { starters: ["rb_weak"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, weeklyPoints);

    const teamA = grades.find((g) => g.rosterId === "A")!;
    const teamB = grades.find((g) => g.rosterId === "B")!;

    expect(teamA.rank).toBe(1);
    expect(teamA.starterValue).toBe(300);
    expect(teamA.replacementValue).toBe(0);
    expect(teamA.surplusValue).toBe(300);

    expect(teamB.rank).toBe(2);
    expect(teamB.starterValue).toBe(100);
    expect(teamB.surplusValue).toBe(100);
  });

  it("subtracts the top free agent's projection from each team's starter value", () => {
    const players = toPlayerMap([
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB"),
      makePlayer("fa1", "RB"),
    ]);
    const weeklyPoints = everyWeek({ rb1: 200, rb2: 100, fa1: 80 });
    const league = makeLeague(["RB"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb1"] }),
      makeRoster("B", { starters: ["rb2"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, weeklyPoints);
    const teamA = grades.find((g) => g.rosterId === "A")!;
    const teamB = grades.find((g) => g.rosterId === "B")!;

    expect(teamA.replacementValue).toBe(80);
    expect(teamA.surplusValue).toBe(200 - 80);
    expect(teamB.replacementValue).toBe(80);
    expect(teamB.surplusValue).toBe(100 - 80);
  });

  it("respects FLEX: a team that starts 2 RBs gets a top-2 replacement ladder", () => {
    const players = toPlayerMap([
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB"),
      makePlayer("rb3", "RB"),
      makePlayer("wr1", "WR"),
      makePlayer("fa1", "RB"),
      makePlayer("fa2", "RB"),
    ]);
    const weeklyPoints = everyWeek({ rb1: 250, rb2: 200, rb3: 220, wr1: 150, fa1: 100, fa2: 80 });
    const league = makeLeague(["RB", "FLEX"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb1"], bench: ["rb2"] }),
      makeRoster("B", { starters: ["rb3"], bench: ["wr1"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, weeklyPoints);
    const teamA = grades.find((g) => g.rosterId === "A")!;
    const teamB = grades.find((g) => g.rosterId === "B")!;

    expect(teamA.starterCount).toBe(2);
    expect(teamA.starterValue).toBe(450);
    expect(teamA.replacementValue).toBe(180);
    expect(teamA.surplusValue).toBe(270);

    expect(teamB.starterCount).toBe(1);
    expect(teamB.starterValue).toBe(220);
    expect(teamB.replacementValue).toBe(100);
    expect(teamB.surplusValue).toBe(120);

    expect(teamA.rank).toBe(1);
    expect(teamB.rank).toBe(2);
  });

  it("penalizes teams that fail to fill a required slot", () => {
    const players = toPlayerMap([
      makePlayer("rb1", "RB"),
      makePlayer("wr1", "WR"),
      makePlayer("fa1", "RB"),
    ]);
    const weeklyPoints = everyWeek({ rb1: 200, wr1: 150, fa1: 80 });
    const league = makeLeague(["RB"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb1"] }),
      makeRoster("B", { starters: ["wr1"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, weeklyPoints);
    const teamA = grades.find((g) => g.rosterId === "A")!;
    const teamB = grades.find((g) => g.rosterId === "B")!;

    // Team A: 200 − 80 = 120 surplus
    expect(teamA.starterCount).toBe(1);
    expect(teamA.starterValue).toBe(200);
    expect(teamA.replacementValue).toBe(80);
    expect(teamA.surplusValue).toBe(120);
    expect(teamA.rank).toBe(1);

    // Team B: 0 RBs but league requires 1. Replacement = top-1 free agent = 80.
    // Surplus = 0 − 80 = −80.
    expect(teamB.starterCount).toBe(0);
    expect(teamB.starterValue).toBe(0);
    expect(teamB.replacementValue).toBe(80);
    expect(teamB.surplusValue).toBe(-80);
    expect(teamB.rank).toBe(2);
  });

  // The scoring format is now applied when the points are built (buildWeeklyPoints, or
  // buildSeasonPoints for the season fallback), not inside analyzePosition.
  it("ranks by the scoring format the points were built in", () => {
    const players = toPlayerMap([makePlayer("wr_a", "WR"), makePlayer("wr_b", "WR")]);
    const projections = toProjectionMap([
      makeProjection("wr_a", 200, 150, 100),
      makeProjection("wr_b", 150, 200, 250),
    ]);
    const rosters = [
      makeRoster("A", { starters: ["wr_a"] }),
      makeRoster("B", { starters: ["wr_b"] }),
    ];
    const league = makeLeague(["WR"], "ppr", 2);

    const ppr = buildSeasonPoints(projections, "ppr");
    const std = buildSeasonPoints(projections, "standard");
    const pprGrades = analyzePosition("WR", league, rosters, players, ppr);
    const stdGrades = analyzePosition("WR", league, rosters, players, std);

    expect(pprGrades.find((g) => g.rosterId === "A")!.rank).toBe(1);
    expect(pprGrades.find((g) => g.rosterId === "B")!.rank).toBe(2);

    expect(stdGrades.find((g) => g.rosterId === "B")!.rank).toBe(1);
    expect(stdGrades.find((g) => g.rosterId === "A")!.rank).toBe(2);
  });

  it("assigns grades from A+ to F across a 12-team league", () => {
    const players: Player[] = [];
    const points: Record<string, number> = {};
    const rosters: Roster[] = [];

    for (let i = 0; i < 12; i++) {
      const id = `rb_${i}`;
      players.push(makePlayer(id, "RB"));
      points[id] = 300 - i * 20;
      rosters.push(makeRoster(`team_${i}`, { starters: [id] }));
    }

    const league = makeLeague(["RB"], "ppr", 12);
    const grades = analyzePosition("RB", league, rosters, toPlayerMap(players), everyWeek(points));

    const best = grades.find((g) => g.rosterId === "team_0")!;
    expect(best.rank).toBe(1);
    expect(best.grade).toBe("A+");

    const worst = grades.find((g) => g.rosterId === "team_11")!;
    expect(worst.rank).toBe(12);
    expect(worst.grade).toBe("F");
  });

  it("returns grades sorted by rank (best first)", () => {
    const players = toPlayerMap([
      makePlayer("rb1", "RB"),
      makePlayer("rb2", "RB"),
      makePlayer("rb3", "RB"),
    ]);
    const weeklyPoints = everyWeek({ rb1: 100, rb2: 300, rb3: 200 });
    const league = makeLeague(["RB"], "ppr", 3);
    const rosters = [
      makeRoster("A", { starters: ["rb1"] }),
      makeRoster("B", { starters: ["rb2"] }),
      makeRoster("C", { starters: ["rb3"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, weeklyPoints);

    expect(grades[0].rosterId).toBe("B");
    expect(grades[0].rank).toBe(1);
    expect(grades[1].rosterId).toBe("C");
    expect(grades[1].rank).toBe(2);
    expect(grades[2].rosterId).toBe("A");
    expect(grades[2].rank).toBe(3);
  });

  it("gives a positive surplus when the team's starter is better than the replacement ladder", () => {
    const players = toPlayerMap([makePlayer("rb_elite", "RB"), makePlayer("rb_free", "RB")]);
    const weeklyPoints = everyWeek({ rb_elite: 300, rb_free: 50 });
    const league = makeLeague(["RB"], "ppr", 1);
    const rosters = [makeRoster("A", { starters: ["rb_elite"] })];

    const grades = analyzePosition("RB", league, rosters, players, weeklyPoints);
    const teamA = grades[0];

    expect(teamA.surplusValue).toBe(250);
    expect(teamA.surplusValue).toBeGreaterThan(0);
  });

  describe("week by week", () => {
    it("averages each week: a starter on bye scores nothing that week", () => {
      // rb1 scores 20 in week 10 and is on bye in week 11 (no projection), with no backup.
      const players = toPlayerMap([makePlayer("rb1", "RB")]);
      const league = makeLeague(["RB"], "ppr", 1);
      const rosters = [makeRoster("A", { starters: ["rb1"] })];

      const [teamA] = analyzePosition(
        "RB",
        league,
        rosters,
        players,
        byWeek({ 10: { rb1: 20 }, 11: {} })
      );

      expect(teamA.starterValue).toBe(10); // (20 + 0) / 2
      expect(teamA.starterCount).toBe(1); // 1 start in week 10, 0 in week 11 → rounds to 1
    });

    it("credits the backup who covers a bye week", () => {
      // Team A has a backup RB who starts in week 11; team B doesn't.
      const players = toPlayerMap([
        makePlayer("rbA1", "RB"),
        makePlayer("rbA2", "RB"),
        makePlayer("rbB", "RB"),
      ]);
      const league = makeLeague(["RB", "BN"], "ppr", 2);
      const rosters = [
        makeRoster("A", { starters: ["rbA1"], bench: ["rbA2"] }),
        makeRoster("B", { starters: ["rbB"] }),
      ];
      const points = byWeek({
        10: { rbA1: 20, rbA2: 8, rbB: 18 },
        11: { rbA2: 8, rbB: 18 }, // rbA1 on bye
      });

      const grades = analyzePosition("RB", league, rosters, players, points);
      const teamA = grades.find((g) => g.rosterId === "A")!;
      const teamB = grades.find((g) => g.rosterId === "B")!;

      expect(teamA.starterValue).toBe(14); // (20 + 8) / 2: the backup fills week 11
      expect(teamB.starterValue).toBe(18);
      expect(teamB.rank).toBe(1);
    });

    it("measures replacement level against each week's best free agent", () => {
      // The best free agent changes from week to week: fa1 in week 10, fa2 in week 11.
      const players = toPlayerMap([
        makePlayer("rb1", "RB"),
        makePlayer("fa1", "RB"),
        makePlayer("fa2", "RB"),
      ]);
      const league = makeLeague(["RB"], "ppr", 1);
      const rosters = [makeRoster("A", { starters: ["rb1"] })];
      const points = byWeek({
        10: { rb1: 15, fa1: 9, fa2: 3 },
        11: { rb1: 15, fa1: 2, fa2: 7 },
      });

      const [teamA] = analyzePosition("RB", league, rosters, players, points);

      expect(teamA.replacementValue).toBe(8); // (9 + 7) / 2, not fa1's (9 + 2) / 2
      expect(teamA.surplusValue).toBe(7);
    });

    it("ignores Sleeper's '0' empty-slot marker", () => {
      const players = toPlayerMap([makePlayer("rb1", "RB")]);
      const league = makeLeague(["RB", "RB"], "ppr", 1);
      const rosters = [makeRoster("A", { starters: ["rb1", "0"] })];

      const [teamA] = analyzePosition("RB", league, rosters, players, everyWeek({ rb1: 12 }));

      expect(teamA.starterCount).toBe(1);
      expect(teamA.starterValue).toBe(12);
    });

    it("grades season totals as a single pseudo-week (the fallback when no weeks remain)", () => {
      const players = toPlayerMap([makePlayer("rb1", "RB"), makePlayer("fa1", "RB")]);
      const league = makeLeague(["RB"], "ppr", 1);
      const rosters = [makeRoster("A", { starters: ["rb1"] })];
      const season = buildSeasonPoints(
        toProjectionMap([makeProjection("rb1", 250), makeProjection("fa1", 90)]),
        "ppr"
      );

      const [teamA] = analyzePosition("RB", league, rosters, players, season);

      expect(teamA).toMatchObject({ starterValue: 250, replacementValue: 90, surplusValue: 160 });
    });
  });
});
