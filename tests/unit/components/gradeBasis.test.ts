import { describe, it, expect } from "vitest";
import { describeGradeBasis } from "@/components/team/gradeBasis";

describe("describeGradeBasis", () => {
  it.each([
    [{ kind: "rest_of_season", weeks: 4 } as const, "Based on 4 remaining weeks", "pts/wk"],
    [{ kind: "rest_of_season", weeks: 1 } as const, "Based on 1 remaining week", "pts/wk"],
    [{ kind: "season" } as const, "Based on season projections", "pts"],
  ])("%o", (basis, note, unit) => {
    expect(describeGradeBasis(basis)).toEqual({ note, unit });
  });
});
