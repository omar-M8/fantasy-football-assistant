import type { Player, Position, NflTeam, InjuryStatus } from "@/domain/entities/Player";
import type { SleeperPlayerDto } from "@/infrastructure/sleeper/dto/SleeperPlayerDto";

/**
 * Maps a SleeperPlayerDto to a Player domain entity.
 *
 * Note: the caller (adapter) guarantees `dto.position` is a valid fantasy
 * position. Non-fantasy players are filtered out before mapping.
 */
export function toPlayer(dto: SleeperPlayerDto): Player {
  return {
    playerId: dto.player_id,
    firstName: dto.first_name,
    lastName: dto.last_name,
    fullName: dto.full_name,
    age: dto.age,
    team: dto.team as NflTeam | null,
    position: dto.position as Position,
    height: dto.height,
    weight: Number(dto.weight),
    injuryStatus: dto.injury_status as InjuryStatus | null,
    status: dto.status?.toLowerCase() === "active" ? "active" : "inactive",
    number: dto.number,
  };
}
