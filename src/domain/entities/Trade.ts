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
  /** Up to four data-backed explanations, most important first. */
  readonly reasons: readonly TradeReason[];
  /** The remaining regular-season weeks evaluated, ascending. Indexes `playerWeeklyPoints`. */
  readonly weeks: readonly number[];
  /**
   * Points per week, aligned with `weeks`, for every player on either roster plus any free
   * agent added. null means no projection that week (a bye); 0 means projected but
   * unavailable (e.g. Out in the current week).
   */
  readonly playerWeeklyPoints: Readonly<Record<string, readonly (number | null)[]>>;
};

/** Which team a reason is about: team A or team B of the proposal. */
export type TradeSideKey = "a" | "b";

/**
 * Why a trade scored the way it did, as data. The UI turns these into sentences from the
 * viewer's side ("You lose…" vs "<team> gains…"), so the engine never writes UI text.
 */
export type TradeReason =
  /** The side's change in team value, per remaining week. */
  | { readonly kind: "weekly_gain"; readonly side: TradeSideKey; readonly weeklyGain: number }
  /** `side` sends more market value than it receives. */
  | {
      readonly kind: "market_value_gap";
      readonly side: TradeSideKey;
      readonly sent: number;
      readonly received: number;
    }
  /** `side` signs a free agent to fill a spot the trade opened. */
  | { readonly kind: "fills_open_spot"; readonly side: TradeSideKey; readonly playerId: string }
  /** `side` drops a player to stay within the roster limit. */
  | { readonly kind: "drops_player"; readonly side: TradeSideKey; readonly playerId: string }
  /** A player `side` receives starts in `weeksStarted` of `totalWeeks` remaining weeks. */
  | {
      readonly kind: "starts_weeks";
      readonly side: TradeSideKey;
      readonly playerId: string;
      readonly weeksStarted: number;
      readonly totalWeeks: number;
    }
  /** A player `side` receives fills in for a starter on bye in `weeks`. */
  | {
      readonly kind: "covers_bye";
      readonly side: TradeSideKey;
      readonly playerId: string;
      readonly weeks: readonly number[];
    };
