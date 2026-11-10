import { describe, it, expect } from "vitest";
import type { TradeReason } from "@/domain/entities/Trade";
import { formatTradeReason, getReasonPlayerIds } from "@/components/trade/formatTradeReason";

const context = { partnerName: "Chig-ers", playerNames: { p1: "Bijan Robinson" } };
const format = (reason: TradeReason) => formatTradeReason(reason, context);

describe("formatTradeReason", () => {
  it.each<[TradeReason, string]>([
    [{ kind: "weekly_gain", side: "a", weeklyGain: -5.6 }, "You lose 5.6 pts/wk"],
    [{ kind: "weekly_gain", side: "b", weeklyGain: 4.3 }, "Chig-ers gain 4.3 pts/wk"],
    [{ kind: "weekly_gain", side: "a", weeklyGain: 0.3 }, "You stay about even (+0.3 pts/wk)"],
    [{ kind: "weekly_gain", side: "b", weeklyGain: 0 }, "Chig-ers stay about even (0.0 pts/wk)"],
    [
      { kind: "market_value_gap", side: "b", sent: 16, received: 12 },
      "Chig-ers give up more market value (16.0 vs 12.0)",
    ],
    [
      { kind: "fills_open_spot", side: "a", playerId: "p1" },
      "You fill the open spot with free agent Bijan Robinson",
    ],
    [
      { kind: "drops_player", side: "b", playerId: "p1" },
      "Chig-ers drop Bijan Robinson to stay within the roster limit",
    ],
    [
      { kind: "starts_weeks", side: "a", playerId: "p1", weeksStarted: 3, totalWeeks: 5 },
      "You start Bijan Robinson in 3 of 5 weeks",
    ],
    [
      { kind: "covers_bye", side: "a", playerId: "p1", weeks: [12] },
      "Bijan Robinson covers your bye in week 12",
    ],
    [
      { kind: "covers_bye", side: "b", playerId: "p1", weeks: [12, 14] },
      "Bijan Robinson covers Chig-ers's bye in weeks 12, 14",
    ],
  ])("%o → %s", (reason, text) => {
    expect(format(reason)).toBe(text);
  });

  it("falls back to the player ID when the name is missing", () => {
    expect(format({ kind: "drops_player", side: "a", playerId: "x9" })).toBe(
      "You drop x9 to stay within the roster limit"
    );
  });
});

describe("getReasonPlayerIds", () => {
  it("lists each mentioned player once", () => {
    const reasons: TradeReason[] = [
      { kind: "weekly_gain", side: "a", weeklyGain: 1 },
      { kind: "drops_player", side: "a", playerId: "p1" },
      { kind: "covers_bye", side: "a", playerId: "p1", weeks: [9] },
      { kind: "fills_open_spot", side: "b", playerId: "p2" },
    ];
    expect(getReasonPlayerIds(reasons)).toEqual(["p1", "p2"]);
  });
});
