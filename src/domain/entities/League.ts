/**
 * A fantasy football league.
 *
 * Represents a league's identity and the rules that govern it —
 * roster construction, scoring format, team count. The domain's
 * grading and trade logic reads from `settings`.
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
 * The rules of the league. Everything the position analyzer needs
 * to interpret raw projections.
 *
 * `rosterPositions` mirrors Sleeper's array verbatim, including
 * slot labels like "QB", "FLEX", "BN". Interpretation happens in
 * the SlotParser, not here.
 */
export type LeagueSettings = {
  readonly scoringFormat: ScoringFormat;
  readonly rosterPositions: readonly string[];
};

/**
 * Sleeper stores receptions scoring as a number (0, 0.5, or 1).
 * The domain normalizes it to this union.
 */
export type ScoringFormat = "standard" | "half_ppr" | "ppr";
