import { describe, it, expect } from "vitest";
import { SleeperLeagueDtoSchema } from "@/infrastructure/sleeper/dto/SleeperLeagueDto";
import { toLeague } from "@/infrastructure/sleeper/mappers/LeagueMapper";

function parseLeagueWithSettings(settings: Record<string, unknown>) {
  return SleeperLeagueDtoSchema.parse({
    league_id: "1",
    name: "Test League",
    season: "2026",
    total_rosters: 12,
    roster_positions: ["QB", "BN"],
    settings,
    scoring_settings: { rec: 1 },
  });
}

describe("toLeague playoffWeekStart", () => {
  it("maps playoff_week_start", () => {
    const league = toLeague(parseLeagueWithSettings({ leg: 9, playoff_week_start: 15 }));

    expect(league.settings.playoffWeekStart).toBe(15);
  });

  it("leaves 0 as reported, since the fallback belongs to the week-range helper", () => {
    const league = toLeague(parseLeagueWithSettings({ playoff_week_start: 0 }));

    expect(league.settings.playoffWeekStart).toBe(0);
  });

  it.each([
    ["missing", {}],
    ["null", { playoff_week_start: null }],
  ])("is undefined when playoff_week_start is %s", (_label, settings) => {
    const league = toLeague(parseLeagueWithSettings(settings));

    expect(league.settings.playoffWeekStart).toBeUndefined();
  });
});
