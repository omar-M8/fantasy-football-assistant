import type { Roster } from "@/domain/entities/Roster";
import type { User } from "@/domain/entities/User";

import { Card } from "@/components/ui/card";

export function TeamHeader({ user, roster }: { user: User; roster: Roster }) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {user.avatarId ? (
            <img
              src={`https://sleepercdn.com/avatars/${user.avatarId}`}
              alt={`${user.displayName} avatar`}
              className="border-border h-14 w-14 rounded-full border"
            />
          ) : (
            <div className="bg-secondary text-primary flex h-14 w-14 items-center justify-center rounded-full font-semibold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{roster.teamName}</h1>
            <p className="text-muted-foreground text-sm">Owned by {user.displayName}</p>
          </div>
        </div>
        <div className="hidden gap-6 sm:flex">
          <Stat label="Record" value={`${roster.wins}-${roster.losses}-${roster.ties}`} />
          <Stat label="Points For" value={roster.pointsFor.toFixed(1)} />
          <Stat label="Points Against" value={roster.pointsAgainst.toFixed(1)} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-muted-foreground text-xs tracking-wider uppercase">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
