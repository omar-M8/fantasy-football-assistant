import type { TradeVerdict } from "@/domain/entities/Trade";
import { TRADE_GAIN_EPSILON } from "@/domain/services/getTradeVerdict";

/** Whether a number reads as good, bad, or no real change. */
export type Tone = "positive" | "negative" | "neutral";

/** Text colour per tone, using the theme tokens only. */
export const TONE_TEXT_CLASS: Record<Tone, string> = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-foreground",
};

/** Gains within ±TRADE_GAIN_EPSILON are neutral, matching how the verdict treats them. */
export function getGainTone(gain: number): Tone {
  if (gain > TRADE_GAIN_EPSILON) return "positive";
  if (gain < -TRADE_GAIN_EPSILON) return "negative";
  return "neutral";
}

/** 6.42 → "+6.4 pts/wk", −1.25 → "−1.3 pts/wk" (true minus sign), 0.04 → "0.0 pts/wk". */
export function formatWeeklyGain(gain: number): string {
  // Round the size, not the signed value: Math.round(-12.5) is -12, so rounding the signed
  // value would show −1.25 as "−1.2" but +1.25 as "+1.3".
  const size = Math.round(Math.abs(gain) * 10) / 10;
  if (size === 0) return "0.0 pts/wk"; // avoids "−0.0" and "+0.0"
  return `${gain > 0 ? "+" : "−"}${size.toFixed(1)} pts/wk`;
}

/** Verdict text from the user's side of the trade (they're always team A). */
export function getVerdictLabel(verdict: TradeVerdict, partnerName: string): string {
  switch (verdict) {
    case "win_win":
      return "Win-win";
    case "even":
      return "Even trade";
    case "favours_a":
      return "Favours you";
    case "favours_b":
      return `Favours ${partnerName}`;
    case "bad_for_both":
      return "Bad for both";
  }
}

/** Good for the user, bad for the user, or neither. */
export function getVerdictTone(verdict: TradeVerdict): Tone {
  if (verdict === "win_win" || verdict === "favours_a") return "positive";
  if (verdict === "favours_b" || verdict === "bad_for_both") return "negative";
  return "neutral";
}
