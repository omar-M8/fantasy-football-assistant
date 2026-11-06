import type { FantasyDataSource } from "@/application/ports/FantasyDataSource";
import type { PlayerProjection } from "@/domain/entities/PlayerProjection";

/** Each uncached week is a ~5.7MB download, so don't start many at once. */
const MAX_WEEKS_AT_A_TIME = 2;

export type WeeklyProjections = ReadonlyMap<number, ReadonlyMap<string, PlayerProjection>>;

type Deps = {
  dataSource: FantasyDataSource;
};

/**
 * Loads projections for the given weeks, at most two at a time.
 *
 * Fails as a whole if any week can't be loaded or comes back empty. A week with no
 * projections would otherwise count as zero points for every player, which would
 * produce a wrong team value with no sign that anything went wrong.
 */
export async function loadWeeklyProjections(
  deps: Deps,
  season: string,
  weeks: readonly number[]
): Promise<WeeklyProjections> {
  const projectionsByWeek = new Map<number, ReadonlyMap<string, PlayerProjection>>();

  for (let i = 0; i < weeks.length; i += MAX_WEEKS_AT_A_TIME) {
    const batch = weeks.slice(i, i + MAX_WEEKS_AT_A_TIME);

    const results = await Promise.all(
      batch.map((week) => deps.dataSource.getWeeklyProjections(season, week))
    );

    results.forEach((projections, index) => {
      const week = batch[index];
      if (projections.size === 0) {
        throw new Error(`No projections available for ${season} week ${week}`);
      }
      projectionsByWeek.set(week, projections);
    });
  }

  return projectionsByWeek;
}
