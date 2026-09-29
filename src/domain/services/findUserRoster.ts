import type { Roster } from "../entities/Roster";

/**
 * Finds a user's roster in a list of rosters.
 * @param rosters represents the list of all rosters belonging to userId
 * @param userId represents the ID of the user whose roster we want to find
 * @returns The user's roster if found, otherwise null
 */
export function findUserRoster(rosters: readonly Roster[], userId: string) {
  return rosters.find((roster) => roster.ownerId === userId) ?? null;
}
