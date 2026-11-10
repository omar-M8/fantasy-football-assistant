import { describe, it, expect } from "vitest";
import type { TradeVerdict } from "@/domain/entities/Trade";
import { getTradeVerdict, TRADE_GAIN_EPSILON as ε } from "@/domain/services/getTradeVerdict";

/** A hair past the boundary, so tests show exactly which side of ±ε each rule sits on. */
const JUST = 0.01;

describe("getTradeVerdict", () => {
  it("uses a 0.5 pts/week noise band", () => {
    expect(ε).toBe(0.5);
  });

  it.each<[gainA: number, gainB: number, verdict: TradeVerdict, why: string]>([
    [0, 0, "even", "no change at all"],
    [ε, ε, "even", "both exactly +ε (inclusive)"],
    [-ε, -ε, "even", "both exactly −ε (inclusive)"],
    [ε, -ε, "even", "one at each edge"],
    [ε + JUST, 0, "win_win", "one just above +ε"],
    [ε + JUST, -ε, "win_win", "the other exactly at −ε still counts as not losing"],
    [3, 2, "win_win", "both clearly gain"],
    [-ε - JUST, -ε - JUST, "bad_for_both", "both just below −ε"],
    [-3, -1, "bad_for_both", "both clearly lose"],
    [ε + JUST, -ε - JUST, "favours_a", "A just gains, B just loses"],
    [-ε - JUST, ε + JUST, "favours_b", "B just gains, A just loses"],
    [0, -ε - JUST, "favours_a", "A unchanged, B loses"],
    [-ε, -ε - JUST, "favours_a", "A at −ε isn't 'bad', so not bad_for_both"],
    [-5, 4, "favours_b", "B wins big"],
  ])("(%s, %s) → %s: %s", (gainA, gainB, verdict) => {
    expect(getTradeVerdict(gainA, gainB)).toBe(verdict);
  });
});
