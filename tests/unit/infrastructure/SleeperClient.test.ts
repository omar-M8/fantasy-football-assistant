import { afterEach, describe, it, expect, vi } from "vitest";
import { DataSourceNotFoundError } from "@/application/ports/DataSourceErrors";
import type { CacheProvider } from "@/application/ports/CacheProvider";
import { InMemoryCache } from "@/infrastructure/cache/InMemoryCache";
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

function makeClient(
  projectionResponse: () => Response = () => Response.json(WEEKLY_ENTRIES),
  realCache?: CacheProvider
) {
  const { cache, saved } = makeRecordingCache();
  const fetchFn = vi.fn(async (url: string | URL | Request) =>
    String(url).endsWith("/state/nfl") ? Response.json(NFL_STATE) : projectionResponse()
  );
  const client = new SleeperClient(
    "https://api.test/v1",
    "https://api.test",
    realCache ?? cache,
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

describe("SleeperClient.getRosters", () => {
  it("falls back to the owner's name when the team name is blank", async () => {
    const roster = (rosterId: number, ownerId: string) => ({
      roster_id: rosterId,
      owner_id: ownerId,
      players: [],
      starters: [],
      reserve: [],
      settings: { wins: 0, losses: 0, ties: 0, fpts: 0, fpts_against: 0 },
    });
    const responses: Record<string, unknown> = {
      "/rosters": [roster(1, "u1"), roster(2, "u2")],
      "/users": [
        { user_id: "u1", display_name: "Faradvance360", avatar: null, metadata: { team_name: "" } },
        { user_id: "u2", display_name: "sam", avatar: null, metadata: { team_name: "Chig-ers" } },
      ],
    };
    const client = new SleeperClient(
      "https://api.test/v1",
      "https://api.test",
      makeRecordingCache().cache,
      (async (url: string | URL | Request) =>
        Response.json(responses[String(url).slice(String(url).lastIndexOf("/"))])) as typeof fetch
    );

    const rosters = await client.getRosters("L");

    expect(rosters.map((r) => r.teamName)).toEqual(["Faradvance360's Team", "Chig-ers"]);
  });
});

describe("SleeperClient not-found handling", () => {
  it("throws DataSourceNotFoundError for a 404 (e.g. an unknown league)", async () => {
    const client = new SleeperClient(
      "https://api.test/v1",
      "https://api.test",
      makeRecordingCache().cache,
      (async () => new Response("null", { status: 404 })) as typeof fetch
    );

    await expect(client.getLeague("123")).rejects.toBeInstanceOf(DataSourceNotFoundError);
  });
});

describe("SleeperClient.getWeeklyProjections", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  // Uses the real InMemoryCache because the recording cache above never expires anything.
  // Week 10 is a future week here, so its cache time is 1 hour.
  it("keeps using the cache until the cache time passes, then re-fetches", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); // Only fake the clock, so promises still resolve
    const { client, projectionCalls } = makeClient(undefined, new InMemoryCache());
    const oneHourMs = 3600 * 1000;

    await client.getWeeklyProjections("2026", 10);
    expect(projectionCalls()).toBe(1);

    vi.advanceTimersByTime(oneHourMs - 1000);
    await client.getWeeklyProjections("2026", 10);
    expect(projectionCalls()).toBe(1);

    vi.advanceTimersByTime(2000);
    await client.getWeeklyProjections("2026", 10);
    expect(projectionCalls()).toBe(2);
  });
});
