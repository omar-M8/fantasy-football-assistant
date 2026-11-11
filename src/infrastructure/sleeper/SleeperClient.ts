import { z } from "zod";

import type { CacheProvider } from "@/application/ports/CacheProvider";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import { DataSourceNotFoundError } from "@/application/ports/DataSourceErrors";

import type { Roster } from "@/domain/entities/Roster";
import type { User } from "@/domain/entities/User";
import type { Player } from "@/domain/entities/Player";
import { isFantasyPosition } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import type { League } from "@/domain/entities/League";
import type { NflState } from "@/domain/entities/NflState";

import { SleeperRosterDtoSchema } from "@/infrastructure/sleeper/dto/SleeperRosterDto";
import { SleeperUserDtoSchema } from "@/infrastructure/sleeper/dto/SleeperUserDto";
import { SleeperPlayerDtoSchema } from "@/infrastructure/sleeper/dto/SleeperPlayerDto";
import { SleeperProjectionDtoSchema } from "@/infrastructure/sleeper/dto/SleeperProjectionDto";
import { SleeperLeagueDtoSchema } from "@/infrastructure/sleeper/dto/SleeperLeagueDto";
import { SleeperNflStateDtoSchema } from "@/infrastructure/sleeper/dto/SleeperNflStateDto";

import { toRoster } from "@/infrastructure/sleeper/mappers/RosterMapper";
import { toUser } from "@/infrastructure/sleeper/mappers/UserMapper";
import { toPlayer } from "@/infrastructure/sleeper/mappers/PlayerMapper";
import { toPlayerProjection } from "@/infrastructure/sleeper/mappers/ProjectionMapper";
import { toLeague } from "@/infrastructure/sleeper/mappers/LeagueMapper";
import { toNflState } from "@/infrastructure/sleeper/mappers/NflStateMapper";

import { unstable_cache } from "next/cache";

/** TTL constants (in seconds) */
const TTL = {
  PLAYERS: 86400, // 24 hours — player metadata changes ~once a day
  PROJECTIONS: 900, // 15 minutes — updates with injury news
  ROSTERS: 300, // 5 minutes — changes on waivers/trades
  LEAGUE: 3600, // 1 hour — rarely changes
  USERS: 3600, // 1 hour — rarely changes
  NFL_STATE: 300, // 5 minutes — notice the week rolling over soon after it happens
  PAST_WEEK_PROJECTIONS: 604800, // 7 days — stop changing once the week is over
  CURRENT_WEEK_PROJECTIONS: 900, // 15 minutes — updates with injury news
  FUTURE_WEEK_PROJECTIONS: 3600, // 1 hour — updated less often than the current week
} as const;

/**
 * Sleeper adapter — the only place in the app that knows Sleeper's API.
 * Implements the FantasyDataSource port so use cases stay source-agnostic.
 */
export class SleeperClient implements FantasyDataSource {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly projectionBaseUrl: string,
    private readonly cache: CacheProvider,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  /**
   * Internal helper to fetch and parse JSON.
   */
  private async fetchFromApi<T>(
    url: string,
    schema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.fetchFn(url, { headers });
    if (response.status === 404) {
      throw new DataSourceNotFoundError(`Sleeper has nothing at ${url}`);
    }
    if (!response.ok) {
      throw new Error(`Sleeper API error on ${url}: ${response.status} ${response.statusText}`);
    }
    return schema.parse(await response.json());
  }

  /**
   * Generic cached GET.
   */
  private async get<T>(path: string, schema: z.ZodType<T>, ttlSeconds = 60): Promise<T> {
    const url = `${this.apiBaseUrl}${path}`;

    // 1. Production Path (Vercel)
    if (process.env.NODE_ENV === "production") {
      return unstable_cache(
        () => this.fetchFromApi(url, schema),
        [path], // Cache key
        { revalidate: ttlSeconds } // TTL
      )();
    }

    // 2. Local Development Path (In-Memory Map)
    const cached = await this.cache.get<T>(path);
    if (cached !== null) {
      console.log(`[CACHE HIT] ${path}`);
      return cached;
    }

    console.log(`[CACHE MISS] ${path}`);
    const parsed = await this.fetchFromApi(url, schema);

    await this.cache.set(path, parsed, ttlSeconds);
    return parsed;
  }

  async getRosters(leagueId: string): Promise<Roster[]> {
    const [rosterDtos, userDtos] = await Promise.all([
      this.get(`/league/${leagueId}/rosters`, SleeperRosterDtoSchema.array(), TTL.ROSTERS),
      this.get(`/league/${leagueId}/users`, SleeperUserDtoSchema.array(), TTL.USERS),
    ]);

    const userById = new Map(userDtos.map((u) => [u.user_id, u]));

    return rosterDtos.map((rosterDto) => {
      const user = userById.get(rosterDto.owner_id);
      // Sleeper sends "" for a team that was never named, so treat blank like missing.
      const teamName =
        user?.metadata?.team_name?.trim() || `${user?.display_name ?? "Unknown"}'s Team`;
      return toRoster(rosterDto, teamName);
    });
  }

  async getUsers(leagueId: string): Promise<User[]> {
    const userDtos = await this.get(
      `/league/${leagueId}/users`,
      SleeperUserDtoSchema.array(),
      TTL.USERS
    );
    return userDtos.map(toUser);
  }

  /**
   * Returns every fantasy-relevant NFL player, keyed by Sleeper player ID.
   *
   * The big picture:
   *   Sleeper's `/players/nfl` endpoint returns ~10,000 players (several MB of JSON).
   *   Most of them don't matter for fantasy (offensive linemen, linebackers, etc.).
   *   Next.js's production cache (`unstable_cache`) refuses to store anything over ~2MB,
   *   so we can't cache the raw response. Instead we:
   *     1. download the raw data,
   *     2. throw away the non-fantasy players,
   *     3. cache only the much smaller filtered list.
   *
   * Example: getPlayers().get("4046") → { fullName: "Patrick Mahomes", position: "QB", ... }
   */
  async getPlayers(): Promise<ReadonlyMap<string, Player>> {
    // It's a variable so both branches below are guaranteed to use the same name.
    const cacheKey = "players-nfl-filtered";

    let filteredEntries: ReadonlyArray<[string, Player]>;

    // NODE_ENV is set to "production" automatically when the app runs on Vercel
    if (process.env.NODE_ENV === "production") {
      // 1. Production path (Vercel)
      // unstable_cache(fn, keyParts, options)` doesn't run anything by itself.
      // It *wraps* our function and gives back a new, cached version of it.

      filteredEntries = await unstable_cache(
        // The work to do on a cache miss. Note that we filter *inside* this
        // function, so only the small filtered list ever gets saved.
        async () => {
          const rawPlayers = await this.fetchRawPlayers();
          return this.filterToFantasyEntries(rawPlayers);
        },
        [cacheKey], // the name this result is stored under
        { revalidate: TTL.PLAYERS } // treat the saved result as stale after 24 hours (86400 seconds)
      )();
    } else {
      // 2. Local development path (in-memory cache)
      //
      // Same idea as above, but done by hand with our own simple cache
      // (`this.cache`, passed into the constructor). Its data only lives
      // in memory, so it resets every time the dev server restarts.

      // Step A: check whether we already have the filtered list saved.
      // `get` returns the saved value, or `null` if nothing is saved (or it expired).
      const cacheHit = await this.cache.get<ReadonlyArray<[string, Player]>>(cacheKey);

      if (cacheHit) {
        // Step B (hit): use the saved copy and skip the network entirely.
        filteredEntries = cacheHit;
      } else {
        // Step B (miss): download, filter, then save the result so the next
        // call within 24 hours is a cache hit.
        const rawPlayers = await this.fetchRawPlayers();
        filteredEntries = this.filterToFantasyEntries(rawPlayers);
        await this.cache.set(cacheKey, filteredEntries, TTL.PLAYERS);
      }
    }

    // Turn the list of [id, player] pairs into a Map, which looks players up by
    // ID quickly: `players.get("4046")`. `new Map(...)` accepts an array of
    // pairs directly; that's exactly the shape `filterToFantasyEntries` builds.
    return new Map(filteredEntries);
  }

  /**
   * Helper method to fetch the raw player DTOs from the Sleeper API, without filtering or mapping to domain entities.
   *
   * Deliberately calls `fetchFromApi` directly instead of `this.get`: `this.get` would cache the full
   * multi-MB raw response, which exceeds the production cache's ~2MB limit. Caching happens in
   * `getPlayers` instead, after filtering.
   * @returns A record of player IDs to their corresponding raw DTOs.
   */
  async fetchRawPlayers(): Promise<Record<string, z.infer<typeof SleeperPlayerDtoSchema>>> {
    return this.fetchFromApi(
      `${this.apiBaseUrl}/players/nfl`,
      z.record(z.string(), SleeperPlayerDtoSchema)
    );
  }

  /**
   * Helper method to filter the raw player DTOs to only include those that are valid fantasy positions.
   * @param rawPlayers - The raw player DTOs.
   * @returns An array of [playerId, Player] tuples for valid fantasy positions.
   */
  filterToFantasyEntries(
    rawPlayers: Record<string, z.infer<typeof SleeperPlayerDtoSchema>>
  ): ReadonlyArray<[string, Player]> {
    const fantasyPlayers: Array<[string, Player]> = [];
    for (const [id, dto] of Object.entries(rawPlayers)) {
      if (!isFantasyPosition(dto.position)) continue;
      fantasyPlayers.push([id, toPlayer(dto)]);
    }
    return fantasyPlayers;
  }

  /**
   * Returns season-long projected fantasy points, keyed by Sleeper player ID.
   *
   * The big picture (same problem `getPlayers` solves):
   *   Sleeper's projections endpoint returns ~9,400 entries (~8.7MB raw, ~2.7MB after
   *   Zod parsing, because `stats` keeps every stat field). Only ~1,480 of them actually
   *   have projected points, and we only need 3 numbers from each.
   *   Next.js's production cache refuses anything over ~2MB, so instead of caching the
   *   raw response we:
   *     1. download the raw data,
   *     2. convert it to small `PlayerProjection` objects (dropping empty entries),
   *     3. cache only that slim list (~105KB, about 4% of the 2MB limit).
   *
   * Example: getSeasonProjections("2026").get("4046") → { pointsPpr: 380.2, ... }
   */
  async getSeasonProjections(season: string): Promise<ReadonlyMap<string, PlayerProjection>> {
    const path = `/projections/nfl/${season}?season_type=regular`;
    const url = `${this.projectionBaseUrl}${path}`;
    const headers = { "User-Agent": "FF-Assistant/1.0", Accept: "application/json" };

    // A new cache name (not just `path`) because what we store has changed shape:
    // the cache used to hold raw Sleeper data, and now it holds mapped
    // PlayerProjection objects. A fresh name means we can never read an old-format entry.
    const cacheKey = `projections-nfl-${season}-mapped`;

    // A plain array, not a Map, because caches store data as JSON and a Map
    // doesn't survive that (see the note in `getPlayers`).
    let projections: ReadonlyArray<PlayerProjection>;

    if (process.env.NODE_ENV === "production") {
      // ── 1. Production path (Vercel) ──────────────────────────────────────
      // Everything inside this function runs only on a cache miss, and only its
      // *return value* is saved. Because we map before returning, only the slim list gets stored.
      projections = await unstable_cache(
        () => this.fetchProjectionEntries(url, headers),
        [cacheKey],
        { revalidate: TTL.PROJECTIONS } // stale after 15 minutes (injury news changes projections)
      )();
    } else {
      // ── 2. Local development path (in-memory cache) ──────────────────────
      const cacheHit = await this.cache.get<ReadonlyArray<PlayerProjection>>(cacheKey);

      if (cacheHit) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        projections = cacheHit;
      } else {
        console.log(`[CACHE MISS] ${cacheKey}`);
        projections = await this.fetchProjectionEntries(url, headers);
        await this.cache.set(cacheKey, projections, TTL.PROJECTIONS);
      }
    }

    // Build the Map *after* reading from the cache, so callers can look up
    // projections by ID: `projections.get("4046")`.
    // `.map(p => [p.playerId, p])` turns each projection into an [id, projection] pair,
    // which is the shape `new Map(...)` expects.
    return new Map(projections.map((p) => [p.playerId, p]));
  }

  /**
   * Helper: downloads raw projections and converts them to slim `PlayerProjection`
   * objects, dropping the ~85% of entries that have no projected points.
   * Not cached itself. `getSeasonProjections` and `getWeeklyProjections` cache its result.
   */
  private async fetchProjectionEntries(
    url: string,
    headers: Record<string, string>
  ): Promise<ReadonlyArray<PlayerProjection>> {
    const dtos = await this.fetchFromApi(url, z.array(SleeperProjectionDtoSchema), headers);

    const projections: PlayerProjection[] = [];
    for (const dto of dtos) {
      // `toPlayerProjection` returns null for entries with no projected points.
      const projection = toPlayerProjection(dto);
      if (projection) projections.push(projection);
    }
    return projections;
  }

  /**
   * Returns one week's projected fantasy points, keyed by Sleeper player ID.
   *
   * Like `getSeasonProjections`, this caches the slim mapped list rather than the
   * ~5.7MB raw response. How long it's cached depends on whether the week is in the
   * past, current, or future, so the NFL state is read first.
   */
  async getWeeklyProjections(
    season: string,
    week: number
  ): Promise<ReadonlyMap<string, PlayerProjection>> {
    const url = `${this.projectionBaseUrl}/projections/nfl/${season}/${week}?season_type=regular`;
    const headers = { "User-Agent": "FF-Assistant/1.0", Accept: "application/json" };

    const { tier, ttlSeconds } = getWeeklyCachePolicy(season, week, await this.getNflState());

    // The tier is part of the key so that a week moving from "future" to "current" to
    // "past" starts a new entry instead of reusing one saved under a different cache time.
    const cacheKey = `projections-nfl-${season}-week-${week}-${tier}`;

    let projections: ReadonlyArray<PlayerProjection>;

    if (process.env.NODE_ENV === "production") {
      projections = await unstable_cache(
        () => this.fetchProjectionEntries(url, headers),
        [cacheKey],
        { revalidate: ttlSeconds }
      )();
    } else {
      const cacheHit = await this.cache.get<ReadonlyArray<PlayerProjection>>(cacheKey);

      if (cacheHit) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        projections = cacheHit;
      } else {
        console.log(`[CACHE MISS] ${cacheKey}`);
        projections = await this.fetchProjectionEntries(url, headers);
        await this.cache.set(cacheKey, projections, ttlSeconds);
      }
    }

    return new Map(projections.map((p) => [p.playerId, p]));
  }

  async getNflState(): Promise<NflState> {
    const dto = await this.get(`/state/nfl`, SleeperNflStateDtoSchema, TTL.NFL_STATE);
    return toNflState(dto);
  }

  async getLeague(leagueId: string): Promise<League> {
    const dto = await this.get(`/league/${leagueId}`, SleeperLeagueDtoSchema, TTL.LEAGUE);
    return toLeague(dto);
  }
}

/**
 * Decides how long a week's projections stay cached, based on where that week
 * falls relative to the NFL's current season and week.
 */
function getWeeklyCachePolicy(
  season: string,
  week: number,
  nflState: NflState
): { tier: "past" | "current" | "future"; ttlSeconds: number } {
  const isPast = season < nflState.season || (season === nflState.season && week < nflState.week);
  if (isPast) return { tier: "past", ttlSeconds: TTL.PAST_WEEK_PROJECTIONS };

  if (season === nflState.season && week === nflState.week) {
    return { tier: "current", ttlSeconds: TTL.CURRENT_WEEK_PROJECTIONS };
  }

  return { tier: "future", ttlSeconds: TTL.FUTURE_WEEK_PROJECTIONS };
}
