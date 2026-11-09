import type { ParsedSlot } from "@/domain/entities/ParsedSlot";

/**
 * How many points a roster is expected to score over a set of weeks,
 * assuming the best possible lineup is started every week.
 */
export type TeamValue = {
  /** Sum of every week's `points`. */
  readonly total: number;
  /** One entry per week, in ascending week order. */
  readonly byWeek: readonly WeeklyTeamValue[];
};

/** The best lineup for one week and the points it's expected to score. */
export type WeeklyTeamValue = {
  readonly week: number;
  /** Sum of the starters' points. Empty slots add nothing. */
  readonly points: number;
  /** Starters only (no bench), in `rosterPositions` order. */
  readonly lineup: readonly ParsedSlot[];
};
