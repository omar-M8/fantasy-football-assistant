# ADR 0002: Position grades use rest-of-season weekly values

- **Status:** Accepted
- **Date:** 2026-11-11
- **Introduced in:** `refactor/grades-rest-of-season`
- **Amended by:** [ADR 0003](0003-trade-page-grades-use-rest-of-season-values.md) (trade-page grades now use rest-of-season values too)
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
6. **Assume a team streams a free agent during a bye.** If a starter is on bye (no projection that week) and the roster has no one else for the slot, that slot counts as replacement level that week (surplus 0), not 0 points. A backup who covers the bye is used as usual, even if a free agent would score more. A team with no player at all for a required slot (e.g. no kicker) still gets no help: that's a roster choice, and a bye isn't.

### Grades and trades differ on byes, on purpose

The trade engine **doesn't** assume bye-week streaming: `computeTeamValue` still counts a bye with no backup as 0 points. The two answer different questions:

- **A grade** says how strong a position is. Without streaming, the grade mostly measured _when_ a team's bye falls. On the demo league with 4 weeks left, one bye with no backup made the TE and DEF last in the league (F), and the kicker D+. With streaming they're C-, C and A+. That's their real strength in the weeks they play.
- **A trade** says what changes for your team. Getting a player who covers a bye is real value, so the weekly gain should keep counting it.

So a trade can show value from covering a bye while the position's grade barely moves. That's expected.

## Alternatives considered

| Option                                                                    | Why not                                                                                                                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep season-long grades** (the earlier decision)                        | The grades keep disagreeing with the trade analyzer, and stay based on stale preseason numbers.                                                                            |
| **Sum each player's rest-of-season points, then grade as before**         | Less work, but it picks one lineup for the whole season. A backup who covers bye weeks gets no credit, and the numbers wouldn't match the trade engine's per-week lineups. |
| **Show nothing when no weeks remain**                                     | An empty `/team` page for months of the year. Season projections are a reasonable stand-in, as long as the page says which one it is.                                      |
| **Byes count as 0 (no streaming)**                                        | One bye with no backup can drop a single-starter position (TE, K, DEF) to last place, so the grade measures bye timing more than strength.                                 |
| **One steady replacement player per position for all weeks**              | At positions where every team starts one player, replacement level is subtracted equally from everyone, so it can't change a rank. Tested: TE and DEF stayed 12th of 12.   |
| **Never score below replacement** (`max(starter, free agent)` every week) | Too blunt: 7 teams tied at exactly 0.0 surplus at K and DEF on the demo league, so grades within the tie would be arbitrary.                                               |

## Consequences

**Good:**

- `/team` grades and the trade engine use the same points, lineups and replacement level, so they no longer contradict each other.
- Bye weeks are handled as managers do: covered by a backup, or by streaming a free agent.
- Surplus as pts/wk reads the same way as the trade analyzer's weekly gain.

**Costs and risks:**

- **Grades moved a lot at launch.** On the demo league, 60 of 72 team-position grades changed. That's the stale season numbers being replaced, but returning users will notice.
- **Noisy late in the season:** with 1–2 weeks left, one bye or one matchup can swing a grade. Grades come from rank, so they always spread from A+ to F however thin the data. The "Based on N remaining weeks" note makes this visible.
- **The current week is excluded,** as in trades. A player who's Out this week isn't penalized.
- **More loading on `/team`:** it now loads weekly projections (cached, shared with `/trades`), and a failed week fails the grades. The page shows an error rather than partial grades.
- **The trade page's grades (Slice 4) are still season-long** and say so in their caption. Whether they switch is a separate decision.
