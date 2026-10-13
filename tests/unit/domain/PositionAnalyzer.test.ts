import { describe, it, expect } from "vitest";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import type { Player, Position } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { League, ScoringFormat } from "@/domain/entities/League";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";

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

// ============================================================================
// Tests
// ============================================================================

describe("analyzePosition", () => {
  it("ranks teams by starter value when there are no free agents", () => {
    const players = toPlayerMap([makePlayer("rb_elite", "RB"), makePlayer("rb_weak", "RB")]);
    const projections = toProjectionMap([
      makeProjection("rb_elite", 300),
      makeProjection("rb_weak", 100),
    ]);
    const league = makeLeague(["RB"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb_elite"] }),
      makeRoster("B", { starters: ["rb_weak"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, projections);

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
    const projections = toProjectionMap([
      makeProjection("rb1", 200),
      makeProjection("rb2", 100),
      makeProjection("fa1", 80),
    ]);
    const league = makeLeague(["RB"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb1"] }),
      makeRoster("B", { starters: ["rb2"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, projections);
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
    const projections = toProjectionMap([
      makeProjection("rb1", 250),
      makeProjection("rb2", 200),
      makeProjection("rb3", 220),
      makeProjection("wr1", 150),
      makeProjection("fa1", 100),
      makeProjection("fa2", 80),
    ]);
    const league = makeLeague(["RB", "FLEX"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb1"], bench: ["rb2"] }),
      makeRoster("B", { starters: ["rb3"], bench: ["wr1"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, projections);
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
    const projections = toProjectionMap([
      makeProjection("rb1", 200),
      makeProjection("wr1", 150),
      makeProjection("fa1", 80),
    ]);
    const league = makeLeague(["RB"], "ppr", 2);
    const rosters = [
      makeRoster("A", { starters: ["rb1"] }),
      makeRoster("B", { starters: ["wr1"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, projections);
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

  it("uses the scoring format from the league to rank players", () => {
    const players = toPlayerMap([makePlayer("wr_a", "WR"), makePlayer("wr_b", "WR")]);
    const projections = toProjectionMap([
      makeProjection("wr_a", 200, 150, 100),
      makeProjection("wr_b", 150, 200, 250),
    ]);
    const rosters = [
      makeRoster("A", { starters: ["wr_a"] }),
      makeRoster("B", { starters: ["wr_b"] }),
    ];

    const pprLeague = makeLeague(["WR"], "ppr", 2);
    const stdLeague = makeLeague(["WR"], "standard", 2);

    const pprGrades = analyzePosition("WR", pprLeague, rosters, players, projections);
    const stdGrades = analyzePosition("WR", stdLeague, rosters, players, projections);

    expect(pprGrades.find((g) => g.rosterId === "A")!.rank).toBe(1);
    expect(pprGrades.find((g) => g.rosterId === "B")!.rank).toBe(2);

    expect(stdGrades.find((g) => g.rosterId === "B")!.rank).toBe(1);
    expect(stdGrades.find((g) => g.rosterId === "A")!.rank).toBe(2);
  });

  it("assigns grades from A+ to F across a 12-team league", () => {
    const players: Player[] = [];
    const projections: PlayerProjection[] = [];
    const rosters: Roster[] = [];

    for (let i = 0; i < 12; i++) {
      const id = `rb_${i}`;
      players.push(makePlayer(id, "RB"));
      projections.push(makeProjection(id, 300 - i * 20));
      rosters.push(makeRoster(`team_${i}`, { starters: [id] }));
    }

    const league = makeLeague(["RB"], "ppr", 12);
    const grades = analyzePosition(
      "RB",
      league,
      rosters,
      toPlayerMap(players),
      toProjectionMap(projections)
    );

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
    const projections = toProjectionMap([
      makeProjection("rb1", 100),
      makeProjection("rb2", 300),
      makeProjection("rb3", 200),
    ]);
    const league = makeLeague(["RB"], "ppr", 3);
    const rosters = [
      makeRoster("A", { starters: ["rb1"] }),
      makeRoster("B", { starters: ["rb2"] }),
      makeRoster("C", { starters: ["rb3"] }),
    ];

    const grades = analyzePosition("RB", league, rosters, players, projections);

    expect(grades[0].rosterId).toBe("B");
    expect(grades[0].rank).toBe(1);
    expect(grades[1].rosterId).toBe("C");
    expect(grades[1].rank).toBe(2);
    expect(grades[2].rosterId).toBe("A");
    expect(grades[2].rank).toBe(3);
  });

  it("gives a positive surplus when the team's starter is better than the replacement ladder", () => {
    const players = toPlayerMap([makePlayer("rb_elite", "RB"), makePlayer("rb_free", "RB")]);
    const projections = toProjectionMap([
      makeProjection("rb_elite", 300),
      makeProjection("rb_free", 50),
    ]);
    const league = makeLeague(["RB"], "ppr", 1);
    const rosters = [makeRoster("A", { starters: ["rb_elite"] })];

    const grades = analyzePosition("RB", league, rosters, players, projections);
    const teamA = grades[0];

    expect(teamA.surplusValue).toBe(250);
    expect(teamA.surplusValue).toBeGreaterThan(0);
  });
});
