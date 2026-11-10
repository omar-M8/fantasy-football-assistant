import type { Position } from "@/domain/entities/Player";
import type { PositionGrade } from "@/domain/entities/PositionGrade";
import type { Roster } from "@/domain/entities/Roster";
import type { TeamTradeImpact, TradeProposal } from "@/domain/entities/Trade";

/** One team's grade at one position, before and after a trade. */
export type PositionGradeChange = {
  readonly rosterId: string;
  readonly position: Position;
  readonly before: PositionGrade;
  readonly after: PositionGrade;
};

/**
 * A team's roster after a trade: minus what it sent and any players it had to drop, plus
 * what it received and any free agents it signed. New arrivals go to the bench (the grading
 * picks its own best lineup, so where they sit doesn't matter).
 */
export function buildRosterAfterTrade(
  roster: Roster,
  sent: readonly string[],
  received: readonly string[],
  impact: Pick<TeamTradeImpact, "addedFreeAgents" | "droppedPlayers">
): Roster {
  const leaving = new Set([...sent, ...impact.droppedPlayers]);
  const keep = (ids: readonly string[]) => ids.filter((id) => !leaving.has(id));
  const arriving = [...received, ...impact.addedFreeAgents].filter((id) => !leaving.has(id));

  return {
    ...roster,
    starterIds: keep(roster.starterIds),
    benchIds: [...keep(roster.benchIds), ...arriving],
    reserveIds: keep(roster.reserveIds),
  };
}

/** Every roster in the league, with the two trading teams replaced by their after-trade rosters. */
export function getRostersAfterTrade(
  rosters: readonly Roster[],
  proposal: TradeProposal,
  impacts: { readonly a: TeamTradeImpact; readonly b: TeamTradeImpact }
): Roster[] {
  const { teamA, teamB } = proposal;
  return rosters.map((roster) => {
    if (roster.rosterId === teamA.rosterId) {
      return buildRosterAfterTrade(roster, teamA.gives, teamB.gives, impacts.a);
    }
    if (roster.rosterId === teamB.rosterId) {
      return buildRosterAfterTrade(roster, teamB.gives, teamA.gives, impacts.b);
    }
    return roster;
  });
}

/**
 * The positions where a team's grade or rank moved, for the given teams, in `rosterIds`
 * order then position order. Grades come from analyzePosition, run before and after.
 */
export function getPositionGradeChanges(
  before: readonly PositionGrade[],
  after: readonly PositionGrade[],
  rosterIds: readonly string[]
): PositionGradeChange[] {
  const key = (g: PositionGrade) => `${g.rosterId}:${g.position}`;
  const afterByKey = new Map(after.map((g) => [key(g), g]));

  return rosterIds.flatMap((rosterId) =>
    before.flatMap((b): PositionGradeChange[] => {
      if (b.rosterId !== rosterId) return [];
      const a = afterByKey.get(key(b));
      if (!a || (a.grade === b.grade && a.rank === b.rank)) return [];
      return [{ rosterId, position: b.position, before: b, after: a }];
    })
  );
}
