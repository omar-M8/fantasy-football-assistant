# Trade analyzer: progress and decisions

Status as of 2026-11-11 (updated for rest-of-season position grades). Read this before continuing the trade analyzer work.

## Done

| Step       | What it delivered                                                                                                            | PR   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ---- |
| Phase 0    | Investigated Sleeper's weekly projections, NFL state, and season-projection staleness (no code)                              | none |
| Phase 1    | `getWeeklyProjections` and `getNflState` (port + Sleeper adapter), `getRemainingRegularSeasonWeeks`, `loadWeeklyProjections` | #10  |
| Phase 2    | `getAvailablePoints`: one player's expected points for one week                                                              | #11  |
| Phase 3    | `computeTeamValue`: best lineup per week, summed                                                                             | #12  |
| Phase 4    | `evaluateTrade`, `getTradeVerdict`, market value, roster-size adjustment, `AnalyzeTrade` use case                            | #13  |
| UI slice 1 | `/trades` page rendered from the URL, with `TradeVerdict` and friendly messages for every outcome                            | #14  |
| Reasons    | Structured `TradeReason` union, `buildTradeReasons`, viewer-perspective `formatTradeReason`                                  | #15  |
| UI slice 2 | `TradeBuilder` (partner dropdown, player chips, URL only); page logic moved to `src/lib/trade-view.ts` and tested            | #17  |
| Fix        | `covers_bye` regular-starter threshold: `min(3, ceil(weeks / 2))`                                                            | #18  |
| UI slice 3 | `LineupDiff`, `ValueBalance`, `WeeklyImpact`; engine returns `weeks` and `playerWeeklyPoints`                                | #19  |
| UI slice 4 | `PositionRoomChange`: season-long position grades before → after, via `getTradePositionGrades`                               | #20  |
| Navbar     | `/trades` link in the navbar                                                                                                 | #22  |
| Team pick  | Visitors can view their own league and team (see `docs/architecture/league-and-team-selection.md`)                           | #23  |

All PRs above are merged into `main`. Rest-of-season position grades (`refactor/grades-rest-of-season`) are open for review.

## Key decisions

### Weeks and timing

- **Regular season only:** weeks run through `playoff_week_start − 1`. The weeks are passed around as a parameter, so adding playoff weeks later means changing one range.
- **The current week is excluded:** remaining weeks start at `currentWeek + 1`, because a trade can't move points already scored and Sleeper keeps projections after kickoff.
- **One helper owns the week range:** `getRemainingRegularSeasonWeeks(league, nflState)` is the only code that reads `playoffWeekStart`. If it's missing or 0, the last regular week is 14. The range is capped at NFL week 18.

### Player and team value

- **Why weekly projections:** the season-long projection is effectively static (preseason numbers with a refreshed timestamp), so trades use weekly projections instead.
- **`getAvailablePoints` rules:**
  - no projection → 0 (this covers byes)
  - `Out` / `IR` / `PUP` / `Sus` → 0 in the current week only
  - otherwise, the projection for the league's scoring format (`Questionable` and `Doubtful` count)
- **`NA`, `COV`, and `DNR`** are unhandled and count as available. There's a TODO on `InjuryStatus`.

### Trade evaluation

- **Market value** = Σ over remaining weeks of `max(0, player points − best free agent at that position that week)`.
- **Fairness** = `round(100 × smaller side's market value ÷ larger side's)`, or 100 when both sides are 0.
- **Roster size:**
  - Only spots _the trade opens_ are filled, using the free agent who adds the most team value (from the top 3 per position).
  - A team over `rosterPositions.length` drops the player it misses least.
  - Reserve players don't count toward the limit.
  - Team B picks free agents after Team A, so they can't both add the same one.
- **`TRADE_GAIN_EPSILON = 0.5` pts/week** (exported from `getTradeVerdict.ts`).
- **Verdict rules,** checked in this order:

  | Verdict                   | Condition                        |
  | ------------------------- | -------------------------------- |
  | `even`                    | both gains within ±ε (inclusive) |
  | `win_win`                 | both ≥ −ε and at least one > ε   |
  | `bad_for_both`            | both < −ε                        |
  | `favours_a` / `favours_b` | otherwise, whichever gained more |

- **The engine throws** for:
  - a player on both sides
  - a player the team doesn't have
  - the same team on both sides
  - an unknown roster
  - no remaining weeks

  `AnalyzeTrade` returns `null` when no weeks remain.

### UI

- **The trade lives in the URL:** `/trades?partner=<rosterId>&give=<id,id>&get=<id>`. The page is a server component rendered from `searchParams`.
- **Validation happens twice, on purpose:** the page (`src/lib/trade-selection.ts`) gives friendly, name-based messages, and the engine is the safety net.
- **Design rules:**
  - existing theme tokens only
  - no animations
  - reuse `PositionBadge`, `Card`, `Badge`, `Container`, and `PageHeader`
  - new components go in `src/components/trade/` and stay presentational
- **`/trades` is in the navbar** (Dashboard, My Team, Trades).

### Structured reasons (built, #15 and #18)

- `reasons` is a `TradeReason[]` union: `weekly_gain`, `market_value_gap`, `fills_open_spot`, `drops_player`, `starts_weeks`, `covers_bye`. Each has `side: "a" | "b"` plus the numbers and player IDs it needs.
- Selection and order (max 4) live in `src/domain/services/buildTradeReasons.ts`. Wording lives in `src/components/trade/formatTradeReason.ts`, from the viewer's side ("You lose 5.6 pts/wk", "Chig-ers gain 4.3 pts/wk").
- **`covers_bye`:** a received player starts in a week when one of the side's regular starters has no projection. A regular starter has at least `min(3, ceil(remainingWeeks / 2))` starts before the trade. Position-agnostic. A player who starts every week gets no `covers_bye`, since `starts_weeks` already covers it.

### Trade breakdown (built, #19)

- `TradeEvaluation` also returns `weeks` and `playerWeeklyPoints` (every player on either roster plus added free agents). `null` means no projection (a bye); `0` means projected but unavailable.
- `src/lib/trade-breakdown.ts` derives the rows; the components only render, for the user's side.

### Position grades: rest-of-season weekly values (decided, ADR 0002)

See [ADR 0002](adr/0002-position-grades-use-rest-of-season-values.md).

- **Grades on `/team` use the same data as trades:** rest-of-season weekly points from `loadRestOfSeasonPoints` (shared by `analyzeTrade` and `getTeamAnalysis`).
- **`analyzePosition` works week by week:**
  - each team's best lineup each week comes from `computeTeamValue`
  - replacement level is the top N free agents at the position _that week_, N = max(starters that week, required slots)
  - a starter on bye with no backup is assumed to be streamed at replacement level (surplus 0 that week); a team with no player at all for a required slot is still penalized. The trade engine doesn't assume this, on purpose (see ADR 0002).
  - starter value, replacement value and surplus are averages per week
  - ranking and the grade bands are unchanged
- **No weeks left (after the regular season, or off-season):** grades fall back to season-long projections, passed in as a single pseudo-week (`buildSeasonPoints`). `/team` shows "Based on season projections" instead of "Based on N remaining weeks".
- **Units:** surplus shows as pts/wk, or pts in the season fallback. Grades come from rank, so units never change a grade.
- **If projections fail to load,** `/team` shows a friendly error.
- **Slice 4 (`getTradePositionGrades`) is still season-long.** It passes season projections through `buildSeasonPoints`, so its output didn't change with this refactor, and its caption still says "Season-long grades". Switching it to rest-of-season grades is a separate, pending decision.

### ScoringNotice rules (approved, not built yet)

Show a notice when the league uses scoring the preset projection totals don't model:

| Sleeper setting                                  | Flag when        |
| ------------------------------------------------ | ---------------- |
| `rec`                                            | not 0, 0.5, or 1 |
| `bonus_rec_te` / `bonus_rec_rb` / `bonus_rec_wr` | > 0              |
| `pass_td`                                        | ≠ 4              |
| `rec_fd`, `rush_fd`, `pass_fd`                   | ≠ 0              |
| `bonus_*_yd_*`                                   | > 0              |

Smaller differences (`pass_int`, `fum_lost`) are ignored. The detected rules go on an **optional** field on `League.settings`, so existing fixtures still compile.

## Locked: don't modify

- `src/domain/services/BuildOptimalLineup.ts`
- `getSeasonProjections` in `src/infrastructure/sleeper/SleeperClient.ts`
- `tests/unit/domain/LineupBuilder.test.ts`
- `src/components/dashboard/*`

## Next steps, in order

1. **Review and merge** `refactor/grades-rest-of-season`.
2. **Decide whether Slice 4's trade grades move to rest-of-season values** to match `/team` (proposal pending).
3. **`feat/scoring-notice`:** detect the ScoringNotice rules above in the league mapper and render `ScoringNotice` on `/trades`. This gets its own small branch.

Out of scope for now: the recommender, `TradePartnerMap`, and `RecommendationCards`.

## Workflow notes

- **Each step:** one branch from an updated `main`, small conventional commits, then `typecheck`, `lint`, `test`, and `build` must pass. Push, open a PR, and don't merge.
- **`gh` isn't installed and the GitHub plugin fails to authenticate,** so PRs are opened by hand from a pre-filled compare link.
- **`npm run typecheck` needs the generated `.next/types`.** On a clean checkout, run `npm run build` first or it fails with `Cannot find name 'LayoutProps'`.
- **Data caching:**
  - Sleeper weekly projections are about 5.7 MB raw, and the slimmed version is cached (about 75 KB per week).
  - Weeks load at most 2 at a time. A failed or empty week fails the whole analysis instead of counting as zero.
- **Don't stack PRs.** PRs are squash-merged, which rewrites a branch's commits, so a PR based on another feature branch either lands on that branch instead of `main` or conflicts. Branch every step from `main`, after the previous PR is merged.
