# ADR 0003: Trade-page grades use rest-of-season values

- **Status:** Accepted
- **Date:** 2026-11-11
- **Introduced in:** `feat/trade-grades-rest-of-season`
- **Amends:** [ADR 0002](0002-position-grades-use-rest-of-season-values.md), which left the trade page's grades season-long as a separate decision

## Context

ADR 0002 moved position grades on `/team` to rest-of-season weekly values. The trade page's "Position grades" section (`getTradePositionGrades`, Slice 4) stayed on season-long projections, with a caption explaining the difference. So the same position could show one grade on My Team and another on the trade page: the mismatch ADR 0002 set out to remove.

## Decision

1. **`getTradePositionGrades` loads points through `loadRestOfSeasonPoints`,** the same helper as `/team` and `analyzeTrade`. It still grades the whole league before and after with both after-trade rosters swapped in, and still shows only the positions that move.
2. **No season fallback here.** The trade page only shows grades after a successful analysis, which already needs remaining weeks. With none left, the use case returns no changes.
3. **`analyzeTrade` stays unchanged.** It doesn't return its weekly points for the grades to reuse. The grades load them again, which is cheap because weekly projections are cached.
4. **The caption becomes** "Rest-of-season grades, same as My Team."

## Alternatives considered

| Option                                                     | Why not                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Keep season-long trade grades**                          | The trade page and My Team keep disagreeing, and the caption has to explain why.                |
| **Have `analyzeTrade` return its weekly points for reuse** | Changes the trade result type for one consumer, when loading again from the cache costs little. |

## Consequences

- My Team and the trade page now show the same grade for the same position and roster.
- Grade changes follow the weekly-gain verdict more closely, because both use the same lineups. A position can still move while the team's overall weekly gain is close to zero, for example when a trade reshuffles who starts at FLEX.
- The bye-week streaming rule from ADR 0002 applies here too, since it lives in `analyzePosition`. The trade engine's weekly gain still doesn't assume streaming, so a trade can show value from covering a bye that the grades don't.
- The trade page now loads league data twice per analysis (once for the evaluation, once for the grades). Both reads hit the same cache.
