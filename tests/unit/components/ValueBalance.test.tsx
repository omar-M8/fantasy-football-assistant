import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TeamTradeImpact } from "@/domain/entities/Trade";
import { ValueBalance } from "@/components/trade/ValueBalance";

function impact(sent: number, received: number): TeamTradeImpact {
  return {
    rosterId: "A",
    valueBefore: 0,
    valueAfter: 0,
    weeklyGain: 0,
    marketValueSent: sent,
    marketValueReceived: received,
    lineupBefore: [],
    lineupAfter: [],
    addedFreeAgents: [],
    droppedPlayers: [],
  };
}

describe("ValueBalance", () => {
  it("shows both values, with the larger one as the full bar", () => {
    const { container } = render(<ValueBalance impact={impact(12, 16)} />);

    expect(screen.getByText("12.0 pts")).toBeTruthy();
    expect(screen.getByText("16.0 pts")).toBeTruthy();
    const widths = [...container.querySelectorAll<HTMLElement>(".bg-primary")].map(
      (bar) => bar.style.width
    );
    expect(widths).toEqual(["75%", "100%"]);
  });

  it("draws empty bars when neither side has market value", () => {
    const { container } = render(<ValueBalance impact={impact(0, 0)} />);

    const widths = [...container.querySelectorAll<HTMLElement>(".bg-primary")].map(
      (bar) => bar.style.width
    );
    expect(widths).toEqual(["0%", "0%"]);
  });
});
