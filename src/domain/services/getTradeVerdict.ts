import type { TradeVerdict } from "@/domain/entities/Trade";

/**
 * Noise band, in points per week. A weekly gain within ±0.5 is treated as no real change:
 * it's under 1% of a typical weekly team score, well inside projection error.
 */
export const TRADE_GAIN_EPSILON = 0.5;

/**
 * Classifies a trade from each team's weekly gain. Rules are checked in order, and the
 * order matters: once `even` is ruled out, `win_win` doesn't need to exclude it, and by the
 * last line the gains can't be equal (equal gains always match an earlier rule).
 *
 *   even         both gains within ±ε
 *   win_win      both ≥ −ε, and at least one > ε
 *   bad_for_both both < −ε
 *   favours_*    otherwise, whichever team gained more
 */
export function getTradeVerdict(gainA: number, gainB: number): TradeVerdict {
  const ε = TRADE_GAIN_EPSILON;

  if (Math.abs(gainA) <= ε && Math.abs(gainB) <= ε) return "even";
  if (gainA >= -ε && gainB >= -ε) return "win_win"; // at least one > ε, since "even" didn't match
  if (gainA < -ε && gainB < -ε) return "bad_for_both";
  return gainA > gainB ? "favours_a" : "favours_b";
}
