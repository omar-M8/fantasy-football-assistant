import { SleeperRosterDto } from "@/infrastructure/sleeper/dto/SleeperRosterDto";
import { Roster } from "@/domain/entities/Roster";

/**
 * Maps a SleeperRosterDto to a Roster domain entity.
 * @param dto The SleeperRosterDto to be mapped
 * @param teamName The name of the team associated with the roster
 * @returns A Roster domain entity
 */

export function toRoster(dto: SleeperRosterDto, teamName: string): Roster {
  const starterSet = new Set(dto.starters);
  const reserveSet = new Set(dto.reserve);
  const benchIds = dto.players.filter((id) => !starterSet.has(id) && !reserveSet.has(id));
  return {
    rosterId: dto.roster_id.toString(),
    ownerId: dto.owner_id,
    teamName,
    wins: dto.settings.wins,
    losses: dto.settings.losses,
    ties: dto.settings.ties,
    pointsFor: dto.settings.fpts,
    pointsAgainst: dto.settings.fpts_against,
    starterIds: dto.starters,
    benchIds,
    reserveIds: dto.reserve,
  };
}
