import { describe, it, expect, vi } from "vitest";
import type { CacheProvider } from "@/application/ports/CacheProvider";
import { SleeperClient } from "@/infrastructure/sleeper/SleeperClient";

/** Cache that records what was saved, so tests can check keys and cache times. */
function makeRecordingCache() {
  const store = new Map<string, unknown>();
  const saved: { key: string; ttlSeconds: number }[] = [];
  const cache: CacheProvider = {
    get: async <T>(key: string) => (store.get(key) as T) ?? null,
    set: async (key, value, ttlSeconds) => {
      store.set(key, value);
      saved.push({ key, ttlSeconds });
    },
  };
  return { cache, saved };
}

const NFL_STATE = { season: "2026", week: 9, season_type: "regular" };

const WEEKLY_ENTRIES = [
  { player_id: "4046", stats: { pts_ppr: 18.59, pts_half_ppr: 18.59, pts_std: 18.59 } },
  { player_id: "bye-player", opponent: null, stats: { adp_dd_ppr: 92 } },
];

function makeClient(projectionResponse: () => Response = () => Response.json(WEEKLY_ENTRIES)) {
  const { cache, saved } = makeRecordingCache();
  const fetchFn = vi.fn(async (url: string | URL | Request) =>
    String(url).endsWith("/state/nfl") ? Response.json(NFL_STATE) : projectionResponse()
  );
  const client = new SleeperClient(
    "https://api.test/v1",
    "https://api.test",
    cache,
    fetchFn as typeof fetch
  );
  const projectionCalls = () =>
    fetchFn.mock.calls.filter(([url]) => String(url).includes("/projections/")).length;

  return { client, fetchFn, saved, projectionCalls };
}

describe("SleeperClient.getNflState", () => {
  it("fetches and maps the NFL state", async () => {
    const { client } = makeClient();

    expect(await client.getNflState()).toEqual({
      season: "2026",
      week: 9,
      seasonType: "regular",
    });
  });
});

describe("SleeperClient.getWeeklyProjections", () => {
  it("requests the given week and keeps only players with projected points", async () => {
    const { client, fetchFn } = makeClient();

    const projections = await client.getWeeklyProjections("2026", 10);

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.test/projections/nfl/2026/10?season_type=regular",
      expect.anything()
    );
    expect([...projections.keys()]).toEqual(["4046"]);
    expect(projections.get("4046")?.pointsPpr).toBe(18.59);
  });

  it.each([
    ["a past week", "2026", 8, "past", 604800],
    ["the current week", "2026", 9, "current", 900],
    ["a future week", "2026", 10, "future", 3600],
    ["any week of a past season", "2025", 18, "past", 604800],
  ])("caches %s under the right tier and time", async (_label, season, week, tier, ttlSeconds) => {
    const { client, saved } = makeClient();

    await client.getWeeklyProjections(season, week);

    expect(saved).toContainEqual({
      key: `projections-nfl-${season}-week-${week}-${tier}`,
      ttlSeconds,
    });
  });

  it("serves a repeat request from the cache", async () => {
    const { client, projectionCalls } = makeClient();

    await client.getWeeklyProjections("2026", 10);
    const second = await client.getWeeklyProjections("2026", 10);

    expect(projectionCalls()).toBe(1);
    expect(second.get("4046")?.pointsPpr).toBe(18.59);
  });

  it("throws on a failed response and caches nothing for that week", async () => {
    const { client, saved } = makeClient(() => new Response("", { status: 500 }));

    await expect(client.getWeeklyProjections("2026", 10)).rejects.toThrow("500");
    expect(saved.some(({ key }) => key.startsWith("projections-"))).toBe(false);
  });
});
