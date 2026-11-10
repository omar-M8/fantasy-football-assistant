import type { TradeEvaluation } from "@/domain/entities/Trade";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatWeeklyGain,
  getGainTone,
  getVerdictLabel,
  getVerdictTone,
  TONE_TEXT_CLASS,
  type Tone,
} from "@/components/trade/tradeFormat";

/** Verdict pill styling per tone, built from the existing badge variants and tokens. */
const PILL: Record<Tone, { variant: "secondary" | "destructive"; className?: string }> = {
  positive: { variant: "secondary", className: "bg-success/15 text-success" },
  negative: { variant: "destructive" },
  neutral: { variant: "secondary" },
};

type TradeVerdictProps = {
  evaluation: TradeEvaluation;
  /** The other team's name. The user is always team A. */
  partnerName: string;
};

/** Verdict pill, each team's weekly gain, the fairness bar, and up to four reasons. */
export function TradeVerdict({ evaluation, partnerName }: TradeVerdictProps) {
  const { verdict, fairness, reasons, teamA, teamB } = evaluation;
  const pill = PILL[getVerdictTone(verdict)];

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Verdict</h2>
          <Badge variant={pill.variant} className={cn("h-6 px-3 text-sm", pill.className)}>
            {getVerdictLabel(verdict, partnerName)}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <GainStat label="You" gain={teamA.weeklyGain} />
          <GainStat label={partnerName} gain={teamB.weeklyGain} />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground tracking-wider uppercase">Fairness</span>
            <span className="font-medium">{fairness}/100</span>
          </div>
          <div
            className="bg-border h-2 overflow-hidden rounded-full"
            role="meter"
            aria-label="Fairness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fairness}
          >
            <div className="bg-primary h-full" style={{ width: `${fairness}%` }} />
          </div>
        </div>

        {reasons.length > 0 && (
          <ul className="text-foreground/90 list-disc space-y-1 pl-5">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GainStat({ label, gain }: { label: string; gain: number }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <div className="text-muted-foreground truncate text-xs tracking-wider uppercase">{label}</div>
      <div className={cn("text-2xl font-semibold", TONE_TEXT_CLASS[getGainTone(gain)])}>
        {formatWeeklyGain(gain)}
      </div>
    </div>
  );
}
