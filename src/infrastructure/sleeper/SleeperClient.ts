import { z } from "zod";

import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";

import type { Roster } from "@/domain/entities/Roster";
import type { User } from "@/domain/entities/User";
import type { Player } from "@/domain/entities/Player";
import { isFantasyPosition } from "@/domain/entities/Player";

import { SleeperRosterDtoSchema } from "@/infrastructure/sleeper/dto/SleeperRosterDto";
import { SleeperUserDtoSchema } from "@/infrastructure/sleeper/dto/SleeperUserDto";
import { SleeperPlayerDtoSchema } from "@/infrastructure/sleeper/dto/SleeperPlayerDto";
import { toRoster } from "@/infrastructure/sleeper/mappers/RosterMapper";
import { toUser } from "@/infrastructure/sleeper/mappers/UserMapper";
import { toPlayer } from "@/infrastructure/sleeper/mappers/PlayerMapper";
import { PlayerProjection } from "@/domain/entities/PlayerProjection";
import { SleeperProjectionDtoSchema } from "./dto/SleeperProjectionDto";
import { toPlayerProjection } from "@/infrastructure/sleeper/mappers/ProjectionMapper";

/**
 * Sleeper adapter — the only place in the app that knows Sleeper's API.
 * Implements the FantasyDataSource port so use cases stay source-agnostic.
 */
export class SleeperClient implements FantasyDataSource {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly projectionBaseUrl: string,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  // A generic GET method that fetches data from the Sleeper API and validates it against a Zod schema.
  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const response = await this.fetchFn(`${this.apiBaseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Sleeper API error on ${path}: ${response.status} ${response.statusText}`);
    }
    const data: unknown = await response.json();
    return schema.parse(data);
  }

  // returns a list of rosters for the given leagueId, mapping Sleeper's DTOs to our domain entities
  async getRosters(leagueId: string): Promise<Roster[]> {
    const [rosterDtos, userDtos] = await Promise.all([
      this.get(`/league/${leagueId}/rosters`, SleeperRosterDtoSchema.array()),
      this.get(`/league/${leagueId}/users`, SleeperUserDtoSchema.array()),
    ]);

    const userById = new Map(userDtos.map((u) => [u.user_id, u]));

    return rosterDtos.map((rosterDto) => {
      const user = userById.get(rosterDto.owner_id);
      const teamName = user?.metadata?.team_name ?? `${user?.display_name ?? "Unknown"}'s Team`;
      return toRoster(rosterDto, teamName);
    });
  }

  // returns a list of users for the given leagueId, mapping Sleeper's DTOs to our domain entities
  async getUsers(leagueId: string): Promise<User[]> {
    const userDtos = await this.get(`/league/${leagueId}/users`, SleeperUserDtoSchema.array());
    return userDtos.map(toUser);
  }

  // returns a map of playerId to Player object, mapping Sleeper's DTOs to our domain entities
  async getPlayers(): Promise<ReadonlyMap<string, Player>> {
    const raw = await this.get(`/players/nfl`, z.record(z.string(), SleeperPlayerDtoSchema));

    const players = new Map<string, Player>();
    for (const [id, dto] of Object.entries(raw)) {
      if (!isFantasyPosition(dto.position)) continue;
      players.set(id, toPlayer(dto));
    }
    return players;
  }

  /**
   * Returns a map of playerId to PlayerProjection object for the given season.
   * @param season - The NFL season year (e.g., "2026").
   * @returns A promise that resolves to a ReadonlyMap of playerId to PlayerProjection.
   */
  async getSeasonProjections(season: string): Promise<ReadonlyMap<string, PlayerProjection>> {
    const url = `${this.projectionBaseUrl}/projections/nfl/${season}?season_type=regular`;
    const response = await this.fetchFn(url, {
      headers: {
        "User-Agent": "FF-Assistant/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Sleeper projections error: ${response.status} ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const dtos = z.array(SleeperProjectionDtoSchema).parse(raw);

    const projections = new Map<string, PlayerProjection>();
    for (const dto of dtos) {
      const projection = toPlayerProjection(dto);
      if (projection) {
        projections.set(projection.playerId, projection);
      }
    }
    return projections;
  }
}
