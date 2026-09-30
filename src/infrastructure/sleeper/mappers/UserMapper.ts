import { User } from "@/domain/entities/User";
import { SleeperUserDto } from "@/infrastructure/sleeper/dto/SleeperUserDto";

/**
 * Maps a SleeperUserDto to a User domain entity.
 * @param dto The SleeperUserDto to be mapped
 * @returns A User domain entity
 */
export function toUser(dto: SleeperUserDto): User {
  return {
    userId: dto.user_id,
    avatarId: dto.avatar,
    displayName: dto.display_name,
  };
}
