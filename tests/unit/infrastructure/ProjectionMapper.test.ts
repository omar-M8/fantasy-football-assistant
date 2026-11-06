import { describe, it, expect } from "vitest";
import { SleeperProjectionDtoSchema } from "@/infrastructure/sleeper/dto/SleeperProjectionDto";
import { toPlayerProjection } from "@/infrastructure/sleeper/mappers/ProjectionMapper";

describe("toPlayerProjection with weekly entries", () => {
  it("maps a weekly entry with projected points", () => {
    // Trimmed copy of a real weekly entry
    const dto = SleeperProjectionDtoSchema.parse({
      player_id: "4046",
      week: 10,
      team: "KC",
      opponent: "ATL",
      stats: { pass_yd: 253.38, pts_ppr: 18.59, pts_half_ppr: 18.59, pts_std: 18.59 },
    });

    expect(toPlayerProjection(dto)).toEqual({
      playerId: "4046",
      pointsPpr: 18.59,
      pointsHalfPpr: 18.59,
      pointsStd: 18.59,
    });
  });

  it("returns null for a bye-week entry, which has stats but no points", () => {
    const dto = SleeperProjectionDtoSchema.parse({
      player_id: "4046",
      week: 5,
      team: "KC",
      opponent: null,
      game_id: null,
      stats: { adp_dd_ppr: 92 },
    });

    expect(toPlayerProjection(dto)).toBeNull();
  });

  it("returns null when stats is null", () => {
    const dto = SleeperProjectionDtoSchema.parse({ player_id: "4046", stats: null });

    expect(toPlayerProjection(dto)).toBeNull();
  });

  it("falls back to PPR points when the other formats are missing", () => {
    const dto = SleeperProjectionDtoSchema.parse({ player_id: "1", stats: { pts_ppr: 10 } });

    expect(toPlayerProjection(dto)).toMatchObject({ pointsHalfPpr: 10, pointsStd: 10 });
  });
});
