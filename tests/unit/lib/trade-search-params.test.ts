import { describe, it, expect } from "vitest";
import { parseTradeSearchParams } from "@/lib/trade-search-params";

describe("parseTradeSearchParams", () => {
  it("parses a complete trade", () => {
    expect(parseTradeSearchParams({ partner: "3", give: "4046,6794", get: "9509" })).toEqual({
      status: "ok",
      trade: { partner: "3", give: ["4046", "6794"], get: ["9509"] },
    });
  });

  it("treats no params as an empty, first-visit state", () => {
    expect(parseTradeSearchParams({})).toEqual({ status: "empty" });
  });

  it("allows one side to be empty", () => {
    const result = parseTradeSearchParams({ partner: "3", give: "4046" });

    expect(result).toEqual({ status: "ok", trade: { partner: "3", give: ["4046"], get: [] } });
  });

  it("accepts team defense IDs like WAS", () => {
    const result = parseTradeSearchParams({ partner: "3", give: "WAS" });

    expect(result.status).toBe("ok");
  });

  it("cleans up spaces, blanks, and duplicates", () => {
    const result = parseTradeSearchParams({ partner: "3", give: " 4046, ,4046,6794 " });

    expect(result).toMatchObject({ trade: { give: ["4046", "6794"] } });
  });

  it("treats repeated keys like a comma list", () => {
    const result = parseTradeSearchParams({ partner: "3", give: ["4046", "6794"] });

    expect(result).toMatchObject({ trade: { give: ["4046", "6794"] } });
  });

  it.each([
    ["no partner", { give: "4046" }, "Pick a trade partner"],
    ["no players", { partner: "3" }, "Add at least one player"],
    ["a non-numeric partner", { partner: "abc", give: "4046" }, "roster ID"],
    ["a repeated partner", { partner: ["3", "4"], give: "4046" }, ""],
    ["a malformed player ID", { partner: "3", give: "40<46" }, "letters and digits"],
    ["too many players", { partner: "3", give: "1,2,3,4,5,6,7,8,9,10,11" }, "At most 10"],
  ])("rejects %s", (_label, raw, message) => {
    const result = parseTradeSearchParams(raw);

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.message).toContain(message);
  });
});
