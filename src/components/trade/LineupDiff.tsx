import type { LineupChange } from "@/lib/trade-breakdown";
import type { BreakdownPlayer } from "@/lib/trade-view";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/dashboard/PositionBadge";

type LineupDiffProps = {
  changes: readonly LineupChange[];
  players: Readonly<Record<string, BreakdownPlayer>>;
  totalWeeks: number;
};

/** Who starts more or less often in the user's best lineup after the trade. */
export function LineupDiff({ changes, players, totalWeeks }: LineupDiffProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Your lineup</h2>
          <p className="text-muted-foreground text-sm">
            Starts and points started over the {totalWeeks} remaining{" "}
            {totalWeeks === 1 ? "week" : "weeks"}, before → after.
          </p>
        </div>

        {changes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Your starters don&apos;t change.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs tracking-wider uppercase">
                <th className="pb-2 font-normal">Player</th>
                <th className="pb-2 text-right font-normal">Starts</th>
                <th className="pb-2 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {changes.map((c) => {
                const player = players[c.playerId];
                const more = c.startsAfter > c.startsBefore;
                return (
                  <tr key={c.playerId}>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        {player?.position && <PositionBadge position={player.position} />}
                        <span className="truncate">{player?.name ?? c.playerId}</span>
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right tabular-nums",
                        more ? "text-success" : "text-destructive"
                      )}
                    >
                      {c.startsBefore} → {c.startsAfter}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {c.pointsBefore.toFixed(1)} → {c.pointsAfter.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
