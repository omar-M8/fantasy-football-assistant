import { z } from "zod";

import type { CacheProvider } from "@/application/ports/CacheProvider";
import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";

import type { Roster } from "@/domain/entities/Roster";
import type { User } from "@/domain/entities/User";
import type { Player } from "@/domain/entities/Player";
import { isFantasyPosition } from "@/domain/entities/Player";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";
import type { League } from "@/domain/entities/League";

import { SleeperRosterDtoSchema } from "@/infrastructure/sleeper/dto/SleeperRosterDto";
import { SleeperUserDtoSchema } from "@/infrastructure/sleeper/dto/SleeperUserDto";
import { SleeperPlayerDtoSchema } from "@/infrastructure/sleeper/dto/SleeperPlayerDto";
import { SleeperProjectionDtoSchema } from "@/infrastructure/sleeper/dto/SleeperProjectionDto";
import { SleeperLeagueDtoSchema } from "@/infrastructure/sleeper/dto/SleeperLeagueDto";

import { toRoster } from "@/infrastructure/sleeper/mappers/RosterMapper";
import { toUser } from "@/infrastructure/sleeper/mappers/UserMapper";
import { toPlayer } from "@/infrastructure/sleeper/mappers/PlayerMapper";
import { toPlayerProjection } from "@/infrastructure/sleeper/mappers/ProjectionMapper";
import { toLeague } from "@/infrastructure/sleeper/mappers/LeagueMapper";

import { unstable_cache } from "next/cache";

/** TTL constants (in seconds) */
const TTL = {
  PLAYERS: 86400, // 24 hours — player metadata changes ~once a day
  PROJECTIONS: 900, // 15 minutes — updates with injury news
  ROSTERS: 300, // 5 minutes — changes on waivers/trades
  LEAGUE: 3600, // 1 hour — rarely changes
  USERS: 3600, // 1 hour — rarely changes
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
      const teamName = user?.metadata?.team_name ?? `${user?.display_name ?? "Unknown"}'s Team`;
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

  async getSeasonProjections(season: string): Promise<ReadonlyMap<string, PlayerProjection>> {
    const path = `/projections/nfl/${season}?season_type=regular`;
    const url = `${this.projectionBaseUrl}${path}`;
    const headers = { "User-Agent": "FF-Assistant/1.0", Accept: "application/json" };
    const schema = z.array(SleeperProjectionDtoSchema);

    let dtos: z.infer<typeof schema>;

    // 1. Production Path (Vercel)
    if (process.env.NODE_ENV === "production") {
      dtos = await unstable_cache(
        () => this.fetchFromApi(url, schema, headers),
        [path], // Cache key
        { revalidate: TTL.PROJECTIONS } // TTL
      )();
    } else {
      // 2. Local Development Path (In-Memory Map)
      const cached = await this.cache.get<ReadonlyMap<string, PlayerProjection>>(path);
      if (cached !== null) {
        console.log(`[CACHE HIT] ${path}`);
        return cached;
      }

      console.log(`[CACHE MISS] ${path}`);
      dtos = await this.fetchFromApi(url, schema, headers);
    }

    // Map the DTOs to domain entities
    const projections = new Map<string, PlayerProjection>();
    for (const dto of dtos) {
      const projection = toPlayerProjection(dto);
      if (projection) {
        projections.set(projection.playerId, projection);
      }
    }

    // Save to local cache if in development
    if (process.env.NODE_ENV !== "production") {
      await this.cache.set(path, projections, TTL.PROJECTIONS);
    }

    return projections;
  }

  async getLeague(leagueId: string): Promise<League> {
    const dto = await this.get(`/league/${leagueId}`, SleeperLeagueDtoSchema, TTL.LEAGUE);
    return toLeague(dto);
  }
}
