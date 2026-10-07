/**
 * A fantasy football league.
 *
 * Represenets a league's identity and the rules that govern it -
 * roster construction, scoring format, team count. The domain's
 * grading and trade logic raedds from `settings`.
 */
export type League = {
  readonly leagueId: string;
  readonly name: string;
  readonly season: string;
  readonly currentWeek: number;
  readonly teamCount: number;
  readonly settings: LeagueSettings;
};

/**
 * The rules of the league. Everything the postion analyzer needs to interpret raw projections.
 *
 * `rosterPositions` mirrors Sleeper's array verbatim, including slot labels like
 * "QB", "FLEX", "BN". Interpretation happens in the SlotParser, not here.
 */

export type LeagueSettings = {
  readonly scoringFormat: "standard" | "half_ppr" | "ppr";
  readonly rosterPositions: readonly string[];
};

/**
 * Sleeper stores receptions scoring as a number (0, 0.5, or 1).
 * The domain normalizes it to this union.
 */

export type ScoringFormat = "standard" | "half_ppr" | "ppr";
