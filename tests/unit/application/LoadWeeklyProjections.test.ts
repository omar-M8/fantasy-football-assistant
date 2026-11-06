import { describe, it, expect } from "vitest";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { loadWeeklyProjections } from "@/application/use-cases/LoadWeeklyProjections";

const PROJECTION: PlayerProjection = {
  playerId: "1",
  pointsPpr: 10,
  pointsHalfPpr: 9,
  pointsStd: 8,
};

/** Data source whose weekly call tracks how many requests are running at once. */
function makeDataSource(
  respond: (week: number) => ReadonlyMap<string, PlayerProjection> = () =>
    new Map([["1", PROJECTION]])
) {
  const stats = { running: 0, maxRunning: 0, requestedWeeks: [] as number[] };

  const dataSource = {
    getWeeklyProjections: async (_season: string, week: number) => {
      stats.requestedWeeks.push(week);
      stats.running++;
      stats.maxRunning = Math.max(stats.maxRunning, stats.running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      stats.running--;
      return respond(week);
    },
  } as unknown as FantasyDataSource;

  return { dataSource, stats };
}

describe("loadWeeklyProjections", () => {
  it("returns each requested week's projections", async () => {
    const { dataSource } = makeDataSource();

    const result = await loadWeeklyProjections({ dataSource }, "2026", [10, 11, 12]);

    expect([...result.keys()]).toEqual([10, 11, 12]);
    expect(result.get(11)?.get("1")).toEqual(PROJECTION);
  });

  it("never loads more than two weeks at a time", async () => {
    const { dataSource, stats } = makeDataSource();

    await loadWeeklyProjections({ dataSource }, "2026", [10, 11, 12, 13, 14]);

    expect(stats.maxRunning).toBe(2);
    expect(stats.requestedWeeks).toEqual([10, 11, 12, 13, 14]);
  });

  it("fails if any week fails, and stops requesting later weeks", async () => {
    const { dataSource, stats } = makeDataSource((week) => {
      if (week === 11) throw new Error("connection dropped");
      return new Map([["1", PROJECTION]]);
    });

    await expect(loadWeeklyProjections({ dataSource }, "2026", [10, 11, 12, 13])).rejects.toThrow(
      "connection dropped"
    );
    expect(stats.requestedWeeks).toEqual([10, 11]);
  });

  it("fails if a week comes back empty rather than treating it as zero points", async () => {
    const { dataSource } = makeDataSource((week) =>
      week === 11 ? new Map() : new Map([["1", PROJECTION]])
    );

    await expect(loadWeeklyProjections({ dataSource }, "2026", [10, 11])).rejects.toThrow(
      "2026 week 11"
    );
  });

  it("returns an empty result when there are no weeks to load", async () => {
    const { dataSource, stats } = makeDataSource();

    const result = await loadWeeklyProjections({ dataSource }, "2026", []);

    expect(result.size).toBe(0);
    expect(stats.requestedWeeks).toEqual([]);
  });
});
