/**
 * A fantasy team's roster in a league.
 *
 * Players are referenced by ID — full Player objects live separately
 * and are joined at the UI layer.
 */
export type Roster = {
  readonly ownerId: string;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
  readonly rosterId: string;
  readonly teamName: string;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly starterIds: readonly string[];
  readonly benchIds: readonly string[];
  readonly reserveIds: readonly string[];
};
