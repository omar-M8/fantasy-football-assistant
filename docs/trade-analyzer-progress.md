# Trade analyzer: progress and decisions

Status as of 2026-11-10. Read this before continuing the trade analyzer work.

## Done

| Step       | What it delivered                                                                                                            | PR   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ---- |
| Phase 0    | Investigated Sleeper's weekly projections, NFL state, and season-projection staleness (no code)                              | none |
| Phase 1    | `getWeeklyProjections` and `getNflState` (port + Sleeper adapter), `getRemainingRegularSeasonWeeks`, `loadWeeklyProjections` | #10  |
| Phase 2    | `getAvailablePoints`: one player's expected points for one week                                                              | #11  |
| Phase 3    | `computeTeamValue`: best lineup per week, summed                                                                             | #12  |
| Phase 4    | `evaluateTrade`, `getTradeVerdict`, market value, roster-size adjustment, `AnalyzeTrade` use case                            | #13  |
| UI slice 1 | `/trades` page rendered from the URL, with `TradeVerdict` and friendly messages for every outcome                            | #14  |

All PRs above are merged into `main`.

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
- **Don't add `/trades` to the navbar** until asked.

### Structured reasons (approved, not built yet)

The engine shouldn't return UI sentences. The plan:

- Replace `reasons: string[]` with a discriminated union `TradeReason`. Each member has `side: "a" | "b"` plus the numbers and player IDs it needs. Planned kinds: `weekly_gain`, `market_value_gap`, `starts_weeks`, `fills_open_spot`, `covers_bye`, plus `drops_player`, which the engine already produces.
- Keep the max-4 selection logic in the domain.
- Add a formatter in `src/components/trade/` that writes each reason from the viewer's side, for example "You lose 5.6 pts/wk" or "Chig-ers gain 4.3 pts/wk".

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
- `src/domain/services/PositionAnalyzer.ts` (`analyzePosition` and position grading)
- `getSeasonProjections` in `src/infrastructure/sleeper/SleeperClient.ts`
- `tests/unit/domain/LineupBuilder.test.ts`, `tests/unit/domain/PositionAnalyzer.test.ts`
- `src/components/dashboard/*`
- `src/components/layout/Navbar.tsx` (no `/trades` link until asked)

## Next steps, in order

1. **`refactor/structured-trade-reasons`:** build the `TradeReason` union, the domain selection logic, the viewer-perspective formatter, and update the tests and `TradeVerdict`.
2. **`feat/scoring-notice`:** detect the rules above in the league mapper and render `ScoringNotice` on `/trades`. This gets its own small branch.
3. **Slice 2, `feat/trade-builder`:** a client picker (partner dropdown, player chips) that only writes to the URL. Picker data is loaded on the server and passed in as props. Also add the page-level test for the "no remaining weeks" message: the logic in `page.tsx` needs moving into a testable module, because page files can't export helpers. (The `AnalyzeTrade` returns-`null` unit test already exists.)
4. **Slice 3, `feat/trade-breakdown`:** `LineupDiff`, `ValueBalance`, and `WeeklyImpact`.
   - `TeamTradeImpact` already has `lineupBefore` and `lineupAfter`: per-week starters and team points.
   - It does **not** have per-player weekly points or bye flags, which `LineupDiff` rows and `WeeklyImpact` need.
   - Propose the smallest engine change and get approval before touching domain code.
5. **Slice 4 (decision only):** position grades use season-long projections, while trades use rest-of-season weekly values. Propose options with trade-offs and wait for a decision.

Out of scope for now: the recommender, `TradePartnerMap`, and `RecommendationCards`.

## Workflow notes

- **Each step:** one branch from an updated `main`, small conventional commits, then `typecheck`, `lint`, `test`, and `build` must pass. Push, open a PR, and don't merge.
- **`gh` isn't installed and the GitHub plugin fails to authenticate,** so PRs are opened by hand from a pre-filled compare link.
- **`npm run typecheck` needs the generated `.next/types`.** On a clean checkout, run `npm run build` first or it fails with `Cannot find name 'LayoutProps'`.
- **Data caching:**
  - Sleeper weekly projections are about 5.7 MB raw, and the slimmed version is cached (about 75 KB per week).
  - Weeks load at most 2 at a time. A failed or empty week fails the whole analysis instead of counting as zero.
- **Leftover local branches:** `feat/evaluate-trade` and `feat/trade-page-shell` are merged and can be deleted.
