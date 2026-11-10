import type { TradeReason } from "@/domain/entities/Trade";
import { formatWeeklyGain, getGainTone } from "@/components/trade/tradeFormat";

export type ReasonContext = {
  /** The other team's name. The user is always side "a". */
  readonly partnerName: string;
  /** playerId → display name, for every player the reasons mention. */
  readonly playerNames: Readonly<Record<string, string>>;
};

/** Every player ID the reasons mention, so the page can look up only those names. */
export function getReasonPlayerIds(reasons: readonly TradeReason[]): string[] {
  return [...new Set(reasons.flatMap((r) => ("playerId" in r ? [r.playerId] : [])))];
}

/**
 * One reason as a sentence from the viewer's side, e.g. "You lose 5.6 pts/wk" or
 * "Chig-ers gain 4.3 pts/wk". "You" and a team name take the same verb form.
 */
export function formatTradeReason(reason: TradeReason, context: ReasonContext): string {
  const who = reason.side === "a" ? "You" : context.partnerName;
  const name = (id: string) => context.playerNames[id] ?? id;

  switch (reason.kind) {
    case "weekly_gain": {
      const tone = getGainTone(reason.weeklyGain);
      const signed = formatWeeklyGain(reason.weeklyGain);
      if (tone === "neutral") return `${who} stay about even (${signed})`;
      // Drop the sign: "gain"/"lose" already says which way.
      const size = signed.slice(1);
      return `${who} ${tone === "positive" ? "gain" : "lose"} ${size}`;
    }
    case "market_value_gap":
      return `${who} give up more market value (${reason.sent.toFixed(1)} vs ${reason.received.toFixed(1)})`;
    case "fills_open_spot":
      return `${who} fill the open spot with free agent ${name(reason.playerId)}`;
    case "drops_player":
      return `${who} drop ${name(reason.playerId)} to stay within the roster limit`;
    case "starts_weeks":
      return `${who} start ${name(reason.playerId)} in ${reason.weeksStarted} of ${reason.totalWeeks} weeks`;
    case "covers_bye":
      return `${name(reason.playerId)} covers ${reason.side === "a" ? "your" : `${who}'s`} bye ${
        reason.weeks.length === 1 ? "in week" : "in weeks"
      } ${reason.weeks.join(", ")}`;
  }
}
