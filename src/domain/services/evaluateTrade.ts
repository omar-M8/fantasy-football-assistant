import type { Player } from "@/domain/entities/Player";
import type { Roster } from "@/domain/entities/Roster";
import type { TeamTradeImpact, TradeEvaluation, TradeProposal } from "@/domain/entities/Trade";
import { adjustRosterSize } from "@/domain/services/adjustRosterSize";
import type { WeeklyPoints } from "@/domain/services/buildWeeklyPoints";
import { computeTeamValue } from "@/domain/services/computeTeamValue";
import {
  getFreeAgentIds,
  getRosterPlayerIds,
  getTopFreeAgents,
} from "@/domain/services/freeAgents";
import { getTradeVerdict, TRADE_GAIN_EPSILON } from "@/domain/services/getTradeVerdict";
import { getMarketValue, getReplacementPoints } from "@/domain/services/marketValue";

/** How many free agents per position to try when a trade opens a roster spot. */
const FREE_AGENT_CANDIDATES_PER_POSITION = 3;
const MAX_REASONS = 4;

export type TradeContext = {
  readonly rosterPositions: readonly string[];
  /** Every roster in the league (needed to know who the free agents are). */
  readonly rosters: readonly Roster[];
  readonly players: ReadonlyMap<string, Player>;
  /** Availability-adjusted points for the remaining weeks (see buildWeeklyPoints). */
  readonly weeklyPoints: WeeklyPoints;
};

/**
 * Evaluates a two-team trade over the remaining regular-season weeks.
 *
 * For each team: swap the players, fix the roster size (adjustRosterSize), then compare
 * computeTeamValue before and after. Market value (points above replacement) measures what
 * each side gives up regardless of roster fit, and drives the fairness score.
 *
 * @throws if there are no weeks to evaluate, the teams aren't two different rosters in the
 *         league, a player appears on both sides, or a player isn't on the team giving him.
 */
export function evaluateTrade(proposal: TradeProposal, context: TradeContext): TradeEvaluation {
  const { rosters, players, weeklyPoints } = context;
  if (weeklyPoints.size === 0) throw new Error("No remaining weeks to evaluate the trade over");

  const rosterA = findRoster(rosters, proposal.teamA.rosterId);
  const rosterB = findRoster(rosters, proposal.teamB.rosterId);
  validateTrade(proposal, rosterA, rosterB);

  // Shared inputs: the free agent pool, weekly replacement level, and fill candidates.
  const freeAgentIds = getFreeAgentIds(players, rosters);
  const replacement = getReplacementPoints(freeAgentIds, players, weeklyPoints);
  const marketValueOf = (ids: readonly string[]) =>
    ids.reduce((sum, id) => sum + getMarketValue(id, players, weeklyPoints, replacement), 0);
  const candidates = getTopFreeAgents(
    freeAgentIds,
    players,
    weeklyPoints,
    FREE_AGENT_CANDIDATES_PER_POSITION
  );

  const { teamA, teamB } = proposal;
  const impactA = evaluateSide(
    rosterA,
    teamA.gives,
    teamB.gives,
    candidates,
    context,
    marketValueOf
  );
  // Team B can't sign a free agent Team A just added.
  const candidatesForB = candidates.filter((id) => !impactA.addedFreeAgents.includes(id));
  const impactB = evaluateSide(
    rosterB,
    teamB.gives,
    teamA.gives,
    candidatesForB,
    context,
    marketValueOf
  );

  return {
    teamA: impactA,
    teamB: impactB,
    verdict: getTradeVerdict(impactA.weeklyGain, impactB.weeklyGain),
    fairness: getFairness(impactA.marketValueSent, impactB.marketValueSent),
    reasons: buildReasons(proposal, rosterA, rosterB, impactA, impactB, players, weeklyPoints.size),
  };
}

/** One team's before/after comparison. */
function evaluateSide(
  roster: Roster,
  gives: readonly string[],
  receives: readonly string[],
  candidateIds: readonly string[],
  { rosterPositions, players, weeklyPoints }: TradeContext,
  marketValueOf: (ids: readonly string[]) => number
): TeamTradeImpact {
  const before = getRosterPlayerIds(roster);
  const originalReserve = new Set(roster.reserveIds);
  const activeBefore = before.filter((id) => !originalReserve.has(id)).length;

  // Received players join the active roster; reserve players sent away leave the reserve.
  const afterSwap = [...before.filter((id) => !gives.includes(id)), ...receives];
  const reserveAfter = new Set(roster.reserveIds.filter((id) => !gives.includes(id)));

  const adjusted = adjustRosterSize({
    rosterPositions,
    playerIds: afterSwap,
    reserveIds: reserveAfter,
    fillTo: activeBefore,
    candidateIds,
    players,
    weeklyPoints,
  });

  const valueBefore = computeTeamValue(rosterPositions, before, players, weeklyPoints);
  const valueAfter = computeTeamValue(rosterPositions, adjusted.playerIds, players, weeklyPoints);

  return {
    rosterId: roster.rosterId,
    valueBefore: valueBefore.total,
    valueAfter: valueAfter.total,
    weeklyGain: (valueAfter.total - valueBefore.total) / weeklyPoints.size,
    marketValueSent: marketValueOf(gives),
    marketValueReceived: marketValueOf(receives),
    lineupBefore: valueBefore.byWeek,
    lineupAfter: valueAfter.byWeek,
    addedFreeAgents: adjusted.added,
    droppedPlayers: adjusted.dropped,
  };
}

function findRoster(rosters: readonly Roster[], rosterId: string): Roster {
  const roster = rosters.find((r) => r.rosterId === rosterId);
  if (!roster) throw new Error(`Roster ${rosterId} is not in this league`);
  return roster;
}

function validateTrade(proposal: TradeProposal, rosterA: Roster, rosterB: Roster): void {
  if (rosterA.rosterId === rosterB.rosterId) {
    throw new Error("A trade needs two different teams");
  }

  const onBothSides = proposal.teamA.gives.filter((id) => proposal.teamB.gives.includes(id));
  if (onBothSides.length > 0) {
    throw new Error(`Players can't be on both sides of a trade: ${onBothSides.join(", ")}`);
  }

  for (const [roster, gives] of [
    [rosterA, proposal.teamA.gives],
    [rosterB, proposal.teamB.gives],
  ] as const) {
    const owned = new Set(getRosterPlayerIds(roster));
    const notOwned = gives.filter((id) => !owned.has(id));
    if (notOwned.length > 0) {
      throw new Error(
        `${roster.teamName} can't trade players it doesn't have: ${notOwned.join(", ")}`
      );
    }
  }
}

/** 100 × the smaller side's market value ÷ the larger side's. Nothing on either side → 100. */
function getFairness(sentA: number, sentB: number): number {
  const larger = Math.max(sentA, sentB);
  return larger === 0 ? 100 : Math.round((100 * Math.min(sentA, sentB)) / larger);
}

/**
 * Short, data-backed explanations, most important first: each team's weekly change, the
 * market-value gap, roster moves the trade forced, then each team's most-used new starter.
 */
function buildReasons(
  proposal: TradeProposal,
  rosterA: Roster,
  rosterB: Roster,
  impactA: TeamTradeImpact,
  impactB: TeamTradeImpact,
  players: ReadonlyMap<string, Player>,
  remainingWeeks: number
): string[] {
  const name = (id: string) => players.get(id)?.fullName ?? id;
  const teams = [
    { team: rosterA.teamName, impact: impactA, receives: proposal.teamB.gives },
    { team: rosterB.teamName, impact: impactB, receives: proposal.teamA.gives },
  ];
  const reasons: string[] = [];

  for (const { team, impact } of teams) reasons.push(describeGain(team, impact.weeklyGain));

  const sentA = impactA.marketValueSent;
  const sentB = impactB.marketValueSent;
  if (sentA.toFixed(1) !== sentB.toFixed(1)) {
    const [giver, more, less] =
      sentA > sentB ? [rosterA.teamName, sentA, sentB] : [rosterB.teamName, sentB, sentA];
    reasons.push(`${giver} gives up more market value (${more.toFixed(1)} vs ${less.toFixed(1)})`);
  }

  for (const { team, impact } of teams) {
    for (const id of impact.addedFreeAgents)
      reasons.push(`${team} fills the open spot with free agent ${name(id)}`);
    for (const id of impact.droppedPlayers)
      reasons.push(`${team} drops ${name(id)} to stay within the roster limit`);
  }

  for (const { team, impact, receives } of teams) {
    const weeksStarted = (id: string) =>
      impact.lineupAfter.filter((w) => w.lineup.some((slot) => slot.playerId === id)).length;
    const mostUsed = maxBy(receives, weeksStarted);
    if (mostUsed !== undefined && weeksStarted(mostUsed) > 0) {
      reasons.push(
        `${team} starts ${name(mostUsed)} in ${weeksStarted(mostUsed)} of ${remainingWeeks} weeks`
      );
    }
  }

  return reasons.slice(0, MAX_REASONS);
}

/** The item with the highest score (earliest wins ties), or undefined for an empty list. */
function maxBy<T>(items: readonly T[], score: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (best === undefined || score(item) > score(best) ? item : best),
    undefined
  );
}

function describeGain(team: string, gain: number): string {
  const amount = Math.abs(gain).toFixed(1);
  if (gain > TRADE_GAIN_EPSILON) return `${team} gains ${amount} pts/week`;
  if (gain < -TRADE_GAIN_EPSILON) return `${team} loses ${amount} pts/week`;
  return `${team} is roughly unchanged (${gain >= 0 ? "+" : "−"}${amount} pts/week)`;
}
