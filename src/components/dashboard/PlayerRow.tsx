import type { Player } from "@/domain/entities/Player";

import { cn } from "@/lib/utils";
import { PositionBadge } from "@/components/dashboard/PositionBadge";

const injuryStyles: Record<string, string> = {
  Questionable: "text-yellow-400",
  Doubtful: "text-orange-400",
  Out: "text-red-400",
  IR: "text-red-400",
};

export function PlayerRow({ player }: { player: Player }) {
  return (
    <div
      className={cn(
        "border-border flex items-center justify-between border-b py-2.5 last:border-0",
        player.status === "inactive" && "opacity-60"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <PositionBadge position={player.position} />
        <span className="truncate text-sm font-medium">
          {player.fullName}{" "}
          <span className="text-muted-foreground text-xs">({player.team ?? "FA"})</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {player.injuryStatus && (
          <span
            className={cn("text-xs", injuryStyles[player.injuryStatus] ?? "text-muted-foreground")}
          >
            {player.injuryStatus}
          </span>
        )}
        {player.number !== null && (
          <span className="text-muted-foreground text-xs">#{player.number}</span>
        )}
      </div>
    </div>
  );
}
