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

  async getPlayers(): Promise<ReadonlyMap<string, Player>> {
    // In production, `this.get` caches the DTO record (which is serializable).
    // We then build the Map from the cached DTOs.
    const raw = await this.get(
      `/players/nfl`,
      z.record(z.string(), SleeperPlayerDtoSchema),
      TTL.PLAYERS
    );

    const players = new Map<string, Player>();
    for (const [id, dto] of Object.entries(raw)) {
      if (!isFantasyPosition(dto.position)) continue;
      players.set(id, toPlayer(dto));
    }
    return players;
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
