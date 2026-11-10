import type {
  TeamTradeImpact,
  TradeProposal,
  TradeReason,
  TradeSideKey,
} from "@/domain/entities/Trade";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";

export const MAX_TRADE_REASONS = 4;

type SideInfo = {
  readonly side: TradeSideKey;
  readonly impact: TeamTradeImpact;
  /** Player IDs this side receives (what the other side gives). */
  readonly receives: readonly string[];
};

/**
 * Picks up to MAX_TRADE_REASONS explanations, most important first:
 * 1. each side's weekly change
 * 2. the market-value gap (if it shows at one decimal)
 * 3. roster moves the trade forced (free agents added, players dropped)
 * 4. per side, the received player who starts most often
 * 5. per side, bye weeks a received player covers
 */
export function buildTradeReasons(
  proposal: TradeProposal,
  impactA: TeamTradeImpact,
  impactB: TeamTradeImpact,
  weeklyPoints: WeeklyPoints
): TradeReason[] {
  const sides: readonly SideInfo[] = [
    { side: "a", impact: impactA, receives: proposal.teamB.gives },
    { side: "b", impact: impactB, receives: proposal.teamA.gives },
  ];
  const totalWeeks = weeklyPoints.size;
  const reasons: TradeReason[] = [];

  for (const { side, impact } of sides) {
    reasons.push({ kind: "weekly_gain", side, weeklyGain: impact.weeklyGain });
  }

  // A gap that rounds away ("12.0 vs 12.0") isn't worth a reason.
  const sentA = impactA.marketValueSent;
  const sentB = impactB.marketValueSent;
  if (sentA.toFixed(1) !== sentB.toFixed(1)) {
    const giver = sentA > sentB ? sides[0] : sides[1];
    reasons.push({
      kind: "market_value_gap",
      side: giver.side,
      sent: giver.impact.marketValueSent,
      received: giver.impact.marketValueReceived,
    });
  }

  for (const { side, impact } of sides) {
    for (const playerId of impact.addedFreeAgents) {
      reasons.push({ kind: "fills_open_spot", side, playerId });
    }
    for (const playerId of impact.droppedPlayers) {
      reasons.push({ kind: "drops_player", side, playerId });
    }
  }

  for (const { side, impact, receives } of sides) {
    const weeksStarted = (id: string) => countWeeksStarted(id, impact);
    const mostUsed = maxBy(receives, weeksStarted);
    if (mostUsed !== undefined && weeksStarted(mostUsed) > 0) {
      reasons.push({
        kind: "starts_weeks",
        side,
        playerId: mostUsed,
        weeksStarted: weeksStarted(mostUsed),
        totalWeeks,
      });
    }
  }

  for (const { side, impact, receives } of sides) {
    for (const playerId of receives) {
      const weeks = findByeWeeksCovered(playerId, impact, weeklyPoints);
      if (weeks.length > 0) reasons.push({ kind: "covers_bye", side, playerId, weeks });
    }
  }

  return reasons.slice(0, MAX_TRADE_REASONS);
}

function countWeeksStarted(playerId: string, impact: TeamTradeImpact): number {
  return impact.lineupAfter.filter((w) => w.lineup.some((slot) => slot.playerId === playerId))
    .length;
}

/** Starts needed before the trade to count as a regular starter. */
const REGULAR_STARTER_MIN_WEEKS = 3;

/**
 * The weeks in which `playerId` (a player this side receives) starts while one of the
 * side's regular starters is on bye. Ascending; position-agnostic, so a FLEX fill-in counts.
 *
 * - Regular starter: in lineupBefore for at least 3 weeks, or at least half (rounded up)
 *   when fewer than 3 weeks remain.
 * - On bye: no projection that week (see getAvailablePoints).
 * - A player who starts every week returns [] (starts_weeks already says that).
 */
export function findByeWeeksCovered(
  playerId: string,
  impact: TeamTradeImpact,
  weeklyPoints: WeeklyPoints
): number[] {
  const totalWeeks = impact.lineupAfter.length;
  const startedWeeks = impact.lineupAfter
    .filter((w) => w.lineup.some((slot) => slot.playerId === playerId))
    .map((w) => w.week);
  if (startedWeeks.length === totalWeeks) return [];

  const threshold =
    totalWeeks >= REGULAR_STARTER_MIN_WEEKS ? REGULAR_STARTER_MIN_WEEKS : Math.ceil(totalWeeks / 2);
  const startsBefore = new Map<string, number>();
  for (const { lineup } of impact.lineupBefore) {
    for (const { playerId: id } of lineup) {
      if (id !== null) startsBefore.set(id, (startsBefore.get(id) ?? 0) + 1);
    }
  }
  const regulars = [...startsBefore].filter(([, n]) => n >= threshold).map(([id]) => id);

  return startedWeeks
    .filter((week) => regulars.some((id) => !weeklyPoints.get(week)?.has(id)))
    .sort((x, y) => x - y);
}

/** The item with the highest score (earliest wins ties), or undefined for an empty list. */
function maxBy<T>(items: readonly T[], score: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (best === undefined || score(item) > score(best) ? item : best),
    undefined
  );
}
