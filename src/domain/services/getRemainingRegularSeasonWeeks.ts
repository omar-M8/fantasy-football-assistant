import type { League } from "@/domain/entities/League";
import type { NflState } from "@/domain/entities/NflState";

/** Last regular week to assume when the league doesn't report a usable playoff start. */
const DEFAULT_LAST_REGULAR_WEEK = 14;

/** The NFL's final week. Sleeper returns no projected points beyond this. */
const LAST_NFL_WEEK = 18;

/**
 * Returns the fantasy regular-season weeks still left to play, in order.
 *
 * This is the only place that should resolve `league.settings.playoffWeekStart`.
 *
 * The current week is deliberately NOT counted: remaining weeks start at
 * `nflState.week + 1`. Once a week is under way some games are already finished, and a
 * trade can't move points that were already scored. Sleeper keeps those games' projections
 * in place after kickoff, so counting the week would credit a trade with finished games.
 *
 * Fantasy playoff weeks are excluded too. Callers pass the resulting weeks along as a
 * parameter, so including playoff weeks later only means changing the range built here.
 *
 * Returns an empty array when the league isn't from the current NFL season, or when
 * the NFL's regular season is over. During the preseason, every week remains.
 *
 * Example: playoff_week_start 15, current week 9 → [10, 11, 12, 13, 14]
 */
export function getRemainingRegularSeasonWeeks(
  league: League,
  nflState: NflState
): readonly number[] {
  if (league.season !== nflState.season) return [];

  let firstWeek: number;
  if (nflState.seasonType === "regular") {
    firstWeek = nflState.week + 1;
  } else if (nflState.seasonType === "pre") {
    firstWeek = 1; // `week` doesn't count regular-season weeks yet
  } else {
    return [];
  }

  const lastWeek = getLastRegularWeek(league);
  const weeks: number[] = [];
  for (let week = firstWeek; week <= lastWeek; week++) {
    weeks.push(week);
  }
  return weeks;
}

/**
 * A missing or 0 `playoffWeekStart` falls back to the default. The result is capped at
 * the NFL's final week so an unexpected value can't produce weeks with no projections.
 */
function getLastRegularWeek(league: League): number {
  const playoffWeekStart = league.settings.playoffWeekStart;
  if (!playoffWeekStart || playoffWeekStart < 1) return DEFAULT_LAST_REGULAR_WEEK;
  return Math.min(playoffWeekStart - 1, LAST_NFL_WEEK);
}
