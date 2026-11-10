import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LineupDiff } from "@/components/trade/LineupDiff";
import { formatChange, WeeklyImpact } from "@/components/trade/WeeklyImpact";

const players = {
  p1: { name: "Bijan Robinson", position: "RB" as const },
  p2: { name: "Old Back", position: "RB" as const },
};

describe("LineupDiff", () => {
  it("shows each changed player's starts and points, before → after", () => {
    render(
      <LineupDiff
        totalWeeks={5}
        players={players}
        changes={[
          { playerId: "p1", startsBefore: 0, startsAfter: 5, pointsBefore: 0, pointsAfter: 72.4 },
          { playerId: "p2", startsBefore: 5, startsAfter: 0, pointsBefore: 50, pointsAfter: 0 },
        ]}
      />
    );

    expect(screen.getByText("Bijan Robinson")).toBeTruthy();
    expect(screen.getByText("0 → 5").className).toContain("text-success");
    expect(screen.getByText("5 → 0").className).toContain("text-destructive");
    expect(screen.getByText("0.0 → 72.4")).toBeTruthy();
  });

  it("says so when the starters don't change", () => {
    render(<LineupDiff totalWeeks={1} players={{}} changes={[]} />);
    expect(screen.getByText("Your starters don't change.")).toBeTruthy();
  });
});

describe("WeeklyImpact", () => {
  it("renders a row per week with the change and byes", () => {
    render(
      <WeeklyImpact
        players={players}
        rows={[
          { week: 12, before: 100, after: 106.3, change: 6.3, byes: [] },
          { week: 13, before: 100, after: 98, change: -2, byes: ["p1"] },
        ]}
      />
    );

    expect(screen.getByText("+6.3").className).toContain("text-success");
    expect(screen.getByText("−2.0").className).toContain("text-destructive");
    expect(screen.getByText("Bijan Robinson")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy(); // no byes in week 12
  });
});

describe("formatChange", () => {
  it.each([
    [3.25, "+3.3"],
    [-1.25, "−1.3"],
    [0.04, "0.0"],
    [-0.04, "0.0"],
  ])("%s → %s", (change, text) => {
    expect(formatChange(change)).toBe(text);
  });
});
