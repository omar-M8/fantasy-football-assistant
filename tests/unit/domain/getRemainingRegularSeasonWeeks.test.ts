import { describe, it, expect } from "vitest";
import type { League } from "@/domain/entities/League";
import type { NflState } from "@/domain/entities/NflState";
import { getRemainingRegularSeasonWeeks } from "@/domain/services/getRemainingRegularSeasonWeeks";

function makeLeague(playoffWeekStart?: number, season = "2026"): League {
  return {
    leagueId: "1",
    name: "Test League",
    season,
    currentWeek: 9,
    teamCount: 12,
    settings: { scoringFormat: "ppr", rosterPositions: ["QB"], playoffWeekStart },
  };
}

function makeState(week: number, seasonType = "regular", season = "2026"): NflState {
  return { season, week, seasonType };
}

describe("getRemainingRegularSeasonWeeks", () => {
  it("starts after the current week and ends before the playoffs", () => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(15), makeState(9))).toEqual([
      10, 11, 12, 13, 14,
    ]);
  });

  it("respects a league's own playoff start", () => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(13), makeState(9))).toEqual([10, 11, 12]);
  });

  it.each([
    ["missing", undefined],
    ["0", 0],
  ])("ends at week 14 when playoffWeekStart is %s", (_label, playoffWeekStart) => {
    const weeks = getRemainingRegularSeasonWeeks(makeLeague(playoffWeekStart), makeState(12));

    expect(weeks).toEqual([13, 14]);
  });

  it("never goes past the NFL's final week", () => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(25), makeState(16))).toEqual([17, 18]);
  });

  it("returns nothing during the last regular week", () => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(15), makeState(14))).toEqual([]);
  });

  it("returns nothing once the fantasy playoffs have started", () => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(15), makeState(16))).toEqual([]);
  });

  it("returns nothing for a league from another season", () => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(15, "2025"), makeState(9))).toEqual([]);
  });

  it("counts every week during the preseason", () => {
    const weeks = getRemainingRegularSeasonWeeks(makeLeague(4), makeState(2, "pre"));

    expect(weeks).toEqual([1, 2, 3]);
  });

  it.each(["post", "off"])("returns nothing when the season type is %s", (seasonType) => {
    expect(getRemainingRegularSeasonWeeks(makeLeague(15), makeState(1, seasonType))).toEqual([]);
  });
});
