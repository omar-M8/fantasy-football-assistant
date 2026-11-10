import type { WeeklyTeamValue } from "@/domain/entities/TeamValue";

/** One side of a trade: the team and the player IDs it sends away. */
export type TradeSide = {
  readonly rosterId: string;
  readonly gives: readonly string[];
};

/** A two-team trade. Each team receives what the other gives. */
export type TradeProposal = {
  readonly teamA: TradeSide;
  readonly teamB: TradeSide;
};

/** How a trade changes one team, over the remaining regular-season weeks. */
export type TeamTradeImpact = {
  readonly rosterId: string;
  /** computeTeamValue total before and after the trade. */
  readonly valueBefore: number;
  readonly valueAfter: number;
  /** (valueAfter − valueBefore) ÷ remaining weeks. */
  readonly weeklyGain: number;
  /** Roster-blind value (points above replacement) of the players sent and received. */
  readonly marketValueSent: number;
  readonly marketValueReceived: number;
  /** Best lineup each week, before and after. */
  readonly lineupBefore: readonly WeeklyTeamValue[];
  readonly lineupAfter: readonly WeeklyTeamValue[];
  /** Free agents added to fill spots the trade opened, and players dropped to fit the roster limit. */
  readonly addedFreeAgents: readonly string[];
  readonly droppedPlayers: readonly string[];
};

/**
 * - even: neither team's value moves meaningfully
 * - win_win: neither team meaningfully loses, and at least one gains
 * - favours_a / favours_b: one team comes out ahead of the other
 * - bad_for_both: both teams meaningfully lose
 */
export type TradeVerdict = "even" | "win_win" | "favours_a" | "favours_b" | "bad_for_both";

export type TradeEvaluation = {
  readonly teamA: TeamTradeImpact;
  readonly teamB: TeamTradeImpact;
  readonly verdict: TradeVerdict;
  /** 0–100. 100 means both sides send equal market value. */
  readonly fairness: number;
  /** Up to four short, data-backed explanations. */
  readonly reasons: readonly string[];
};
