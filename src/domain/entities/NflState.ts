/**
 * Where the NFL calendar currently stands.
 *
 * `seasonType` is kept as a plain string because it mirrors the source's
 * value (e.g. "regular"). `getRemainingRegularSeasonWeeks` interprets it.
 */
export type NflState = {
  readonly season: string;
  readonly week: number;
  readonly seasonType: string;
};
