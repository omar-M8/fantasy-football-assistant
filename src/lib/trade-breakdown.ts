import type { TeamTradeImpact, TradeEvaluation } from "@/domain/entities/Trade";

/** A player whose number of starts changes because of the trade. */
export type LineupChange = {
  readonly playerId: string;
  readonly startsBefore: number;
  readonly startsAfter: number;
  /** Points scored in the weeks he starts, before and after. */
  readonly pointsBefore: number;
  readonly pointsAfter: number;
};

/** One remaining week: team points before and after, and which starters are on bye. */
export type WeeklyImpactRow = {
  readonly week: number;
  readonly before: number;
  readonly after: number;
  readonly change: number;
  /** Players who start for the team in some week (before or after) but are on bye this week. */
  readonly byes: readonly string[];
};

type WeeklyData = Pick<TradeEvaluation, "weeks" | "playerWeeklyPoints">;

/**
 * Players whose starts change, biggest change in points started first. Players who start
 * just as often before and after are left out, even if they move between slots.
 */
export function getLineupChanges(impact: TeamTradeImpact, data: WeeklyData): LineupChange[] {
  const pointsIn = (id: string, week: number) =>
    data.playerWeeklyPoints[id]?.[data.weeks.indexOf(week)] ?? 0;

  const tally = (lineups: TeamTradeImpact["lineupBefore"]) => {
    const totals = new Map<string, { starts: number; points: number }>();
    for (const { week, lineup } of lineups) {
      for (const { playerId } of lineup) {
        if (playerId === null) continue;
        const t = totals.get(playerId) ?? { starts: 0, points: 0 };
        totals.set(playerId, { starts: t.starts + 1, points: t.points + pointsIn(playerId, week) });
      }
    }
    return totals;
  };

  const before = tally(impact.lineupBefore);
  const after = tally(impact.lineupAfter);
  const ids = [...new Set([...before.keys(), ...after.keys()])];

  return ids
    .map((playerId) => ({
      playerId,
      startsBefore: before.get(playerId)?.starts ?? 0,
      startsAfter: after.get(playerId)?.starts ?? 0,
      pointsBefore: before.get(playerId)?.points ?? 0,
      pointsAfter: after.get(playerId)?.points ?? 0,
    }))
    .filter((c) => c.startsBefore !== c.startsAfter)
    .sort(
      (x, y) => Math.abs(y.pointsAfter - y.pointsBefore) - Math.abs(x.pointsAfter - x.pointsBefore)
    );
}

/** One row per remaining week, in week order. */
export function getWeeklyImpactRows(impact: TeamTradeImpact, data: WeeklyData): WeeklyImpactRow[] {
  const starters = new Set(
    [...impact.lineupBefore, ...impact.lineupAfter].flatMap((w) =>
      w.lineup.flatMap((slot) => (slot.playerId === null ? [] : [slot.playerId]))
    )
  );

  return impact.lineupBefore.map((weekBefore, i) => {
    const { week } = weekBefore;
    const after = impact.lineupAfter[i]?.points ?? 0;
    const index = data.weeks.indexOf(week);
    return {
      week,
      before: weekBefore.points,
      after,
      change: after - weekBefore.points,
      byes: [...starters].filter((id) => data.playerWeeklyPoints[id]?.[index] === null),
    };
  });
}
