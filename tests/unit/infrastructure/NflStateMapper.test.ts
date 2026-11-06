import { describe, it, expect } from "vitest";
import { SleeperNflStateDtoSchema } from "@/infrastructure/sleeper/dto/SleeperNflStateDto";
import { toNflState } from "@/infrastructure/sleeper/mappers/NflStateMapper";

describe("toNflState", () => {
  it("maps Sleeper's response and drops fields we do not consume", () => {
    // Trimmed copy of a real /state/nfl response
    const dto = SleeperNflStateDtoSchema.parse({
      week: 9,
      leg: 9,
      season: "2026",
      season_type: "regular",
      display_week: 9,
    });

    expect(toNflState(dto)).toEqual({ season: "2026", week: 9, seasonType: "regular" });
  });

  it("rejects a response without a week", () => {
    expect(() =>
      SleeperNflStateDtoSchema.parse({ season: "2026", season_type: "regular" })
    ).toThrow();
  });
});
