import type { Roster } from "@/domain/entities/Roster";
import type { User } from "@/domain/entities/User";

/** One team on /select-team. */
export type TeamChoice = {
  readonly userId: string;
  readonly teamName: string;
  readonly ownerName: string;
  readonly avatarId: string | null;
  /** "W-L" or "W-L-T" when there are ties. */
  readonly record: string;
};

/**
 * The league's teams, in roster order, with their owner's name and avatar. Teams whose
 * owner isn't in the league's user list are left out, since there's no one to pick.
 */
export function buildTeamChoices(rosters: readonly Roster[], users: readonly User[]): TeamChoice[] {
  const userById = new Map(users.map((u) => [u.userId, u]));
  return rosters.flatMap((roster) => {
    const owner = userById.get(roster.ownerId);
    if (!owner) return [];
    const record =
      roster.ties > 0
        ? `${roster.wins}-${roster.losses}-${roster.ties}`
        : `${roster.wins}-${roster.losses}`;
    return [
      {
        userId: owner.userId,
        teamName: roster.teamName,
        ownerName: owner.displayName,
        avatarId: owner.avatarId,
        record,
      },
    ];
  });
}
