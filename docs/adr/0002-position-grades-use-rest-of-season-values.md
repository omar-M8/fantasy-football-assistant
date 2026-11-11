# ADR 0002: Position grades use rest-of-season weekly values

- **Status:** Accepted
- **Date:** 2026-11-11
- **Introduced in:** `refactor/grades-rest-of-season`
- **Related:** [Trade analyzer progress](../trade-analyzer-progress.md#position-grades-rest-of-season-weekly-values-decided-adr-0002)

## Context

Position grades on `/team` were computed from Sleeper's season-long projections. The trade analyzer uses rest-of-season weekly projections, because the season-long ones are effectively static: preseason numbers with a refreshed timestamp. So the two features disagreed. A team could rank 7th at QB on `/team` while the trade page valued its QB as one of the league's best.

Earlier this season, the decision was to keep grades season-long and revisit later. This ADR replaces that decision.

## Decision

1. **Grades use the trade engine's data.** `getTeamAnalysis` loads points through `loadRestOfSeasonPoints`, the same helper `analyzeTrade` uses: remaining regular-season weeks → weekly projections → `getAvailablePoints` in the league's scoring format.
2. **`analyzePosition` grades week by week.** Each week it takes each team's best lineup from `computeTeamValue` and compares the starters at the position with that week's best free agents. Starter value, replacement level and surplus are averaged per week. Ranking and grade bands are unchanged. `BuildOptimalLineup` isn't changed.
3. **Fallback when no weeks remain** (after the regular season, or off-season): grade on season-long projections, passed in as a single pseudo-week (`buildSeasonPoints`), so the page never goes empty.
4. **Label the basis on `/team`:** "Based on N remaining weeks", or "Based on season projections" for the fallback. Surplus shows as pts/wk, or pts for the fallback.
5. **Show a friendly error on `/team`** if projections fail to load.

## Alternatives considered

| Option                                                            | Why not                                                                                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep season-long grades** (the earlier decision)                | The grades keep disagreeing with the trade analyzer, and stay based on stale preseason numbers.                                                                            |
| **Sum each player's rest-of-season points, then grade as before** | Less work, but it picks one lineup for the whole season. A backup who covers bye weeks gets no credit, and the numbers wouldn't match the trade engine's per-week lineups. |
| **Show nothing when no weeks remain**                             | An empty `/team` page for months of the year. Season projections are a reasonable stand-in, as long as the page says which one it is.                                      |

## Consequences

**Good:**

- `/team` grades and the trade engine use the same points, lineups and replacement level, so they no longer contradict each other.
- Bye weeks, and the backups who cover them, now show up in the grades.
- Surplus as pts/wk reads the same way as the trade analyzer's weekly gain.

**Costs and risks:**

- **Grades moved a lot at launch.** On the demo league, 57 of 72 team-position grades changed. That's the stale season numbers being replaced, but returning users will notice.
- **Noisy late in the season:** with 1–2 weeks left, one bye or one matchup can swing a grade. Grades come from rank, so they always spread from A+ to F however thin the data. The "Based on N remaining weeks" note makes this visible.
- **The current week is excluded,** as in trades. A player who's Out this week isn't penalized.
- **More loading on `/team`:** it now loads weekly projections (cached, shared with `/trades`), and a failed week fails the grades. The page shows an error rather than partial grades.
- **The trade page's grades (Slice 4) are still season-long** and say so in their caption. Whether they switch is a separate decision.
