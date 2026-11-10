import { describe, it, expect } from "vitest";
import type { TradeVerdict } from "@/domain/entities/Trade";
import {
  formatWeeklyGain,
  getGainTone,
  getVerdictLabel,
  getVerdictTone,
} from "@/components/trade/tradeFormat";

describe("getGainTone", () => {
  it.each([
    [6.4, "positive"],
    [0.51, "positive"],
    [0.5, "neutral"], // ±ε is inclusive, matching getTradeVerdict
    [0, "neutral"],
    [-0.5, "neutral"],
    [-0.51, "negative"],
    [-3, "negative"],
  ])("%s → %s", (gain, tone) => {
    expect(getGainTone(gain)).toBe(tone);
  });
});

describe("formatWeeklyGain", () => {
  it.each([
    [6.42, "+6.4 pts/wk"],
    [-1.25, "−1.3 pts/wk"], // true minus sign
    [0.04, "0.0 pts/wk"], // no "+0.0"
    [-0.04, "0.0 pts/wk"], // no "−0.0"
    [12, "+12.0 pts/wk"],
  ])("%s → %s", (gain, text) => {
    expect(formatWeeklyGain(gain)).toBe(text);
  });
});

describe("verdict label and tone", () => {
  it.each<[TradeVerdict, string, string]>([
    ["win_win", "Win-win", "positive"],
    ["even", "Even trade", "neutral"],
    ["favours_a", "Favours you", "positive"],
    ["favours_b", "Favours Rival FC", "negative"],
    ["bad_for_both", "Bad for both", "negative"],
  ])("%s → %s (%s)", (verdict, label, tone) => {
    expect(getVerdictLabel(verdict, "Rival FC")).toBe(label);
    expect(getVerdictTone(verdict)).toBe(tone);
  });
});
