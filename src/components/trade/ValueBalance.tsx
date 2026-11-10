import type { TeamTradeImpact } from "@/domain/entities/Trade";

import { Card, CardContent } from "@/components/ui/card";

type ValueBalanceProps = {
  /** The user's side (team A). The partner's side is the mirror image, so one is enough. */
  impact: TeamTradeImpact;
};

/**
 * Market value (points above the best free agent, over the remaining weeks) the user sends
 * vs receives, as two bars on a shared scale. Roster-blind: it shows what the players are
 * worth, not how they fit, which is what the weekly gain above measures.
 */
export function ValueBalance({ impact }: ValueBalanceProps) {
  const { marketValueSent: sent, marketValueReceived: received } = impact;
  const scale = Math.max(sent, received);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Market value</h2>
          <p className="text-muted-foreground text-sm">
            Points above the best free agent, over the rest of the regular season.
          </p>
        </div>
        <ValueBar label="You send" value={sent} scale={scale} />
        <ValueBar label="You receive" value={received} scale={scale} />
      </CardContent>
    </Card>
  );
}

function ValueBar({ label, value, scale }: { label: string; value: number; scale: number }) {
  const width = scale === 0 ? 0 : (100 * value) / scale;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)} pts</span>
      </div>
      <div className="bg-border h-2 overflow-hidden rounded-full" aria-hidden="true">
        <div className="bg-primary h-full" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
