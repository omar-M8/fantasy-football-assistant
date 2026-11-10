import type { WeeklyImpactRow } from "@/lib/trade-breakdown";
import type { BreakdownPlayer } from "@/lib/trade-view";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { getGainTone, TONE_TEXT_CLASS } from "@/components/trade/tradeFormat";

type WeeklyImpactProps = {
  rows: readonly WeeklyImpactRow[];
  players: Readonly<Record<string, BreakdownPlayer>>;
};

/** The user's projected points each remaining week, before and after, with bye flags. */
export function WeeklyImpact({ rows, players }: WeeklyImpactProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Week by week</h2>
          <p className="text-muted-foreground text-sm">Your best lineup&apos;s projected points.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs tracking-wider uppercase">
                <th className="pb-2 font-normal">Week</th>
                <th className="pb-2 text-right font-normal">Before</th>
                <th className="pb-2 text-right font-normal">After</th>
                <th className="pb-2 text-right font-normal">Change</th>
                <th className="pb-2 pl-4 font-normal">Byes</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.week}>
                  <td className="py-2">{row.week}</td>
                  <td className="py-2 text-right tabular-nums">{row.before.toFixed(1)}</td>
                  <td className="py-2 text-right tabular-nums">{row.after.toFixed(1)}</td>
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums",
                      TONE_TEXT_CLASS[getGainTone(row.change)]
                    )}
                  >
                    {formatChange(row.change)}
                  </td>
                  <td className="text-muted-foreground py-2 pl-4">
                    {row.byes.map((id) => players[id]?.name ?? id).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** 3.25 → "+3.3", −1.25 → "−1.3" (true minus), 0.04 → "0.0". */
export function formatChange(change: number): string {
  const size = Math.round(Math.abs(change) * 10) / 10;
  if (size === 0) return "0.0";
  return `${change > 0 ? "+" : "−"}${size.toFixed(1)}`;
}
