import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Grade } from "@/domain/entities/PositionGrade";
import type { PositionGradeChange } from "@/domain/services/tradePositionGrades";
import { PositionRoomChange } from "@/components/trade/PositionRoomChange";

function change(rosterId: string, from: [Grade, number], to: [Grade, number]): PositionGradeChange {
  const grade = ([g, rank]: [Grade, number]) => ({
    rosterId,
    position: "RB" as const,
    grade: g,
    rank,
    teamCount: 12,
    starterCount: 2,
    starterValue: 0,
    replacementValue: 0,
    surplusValue: 0,
  });
  return { rosterId, position: "RB", before: grade(from), after: grade(to) };
}

describe("PositionRoomChange", () => {
  it("lists each team's moved grades with a caption about season-long grades", () => {
    render(
      <PositionRoomChange
        myRosterId="1"
        partnerRosterId="2"
        partnerName="Chig-ers"
        changes={[change("1", ["C+", 7], ["B", 4])]}
      />
    );

    expect(screen.getByText(/Season-long grades/)).toBeTruthy();
    expect(screen.getByText("C+ → B (7th → 4th)").className).toContain("text-success");
    expect(screen.getByText("Chig-ers")).toBeTruthy();
    expect(screen.getByText("No grade changes.")).toBeTruthy(); // the partner's column
  });
});
