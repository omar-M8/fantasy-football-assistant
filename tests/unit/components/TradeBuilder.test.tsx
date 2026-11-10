import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TradePickerData } from "@/lib/trade-picker";
import { TradeBuilder } from "@/components/trade/TradeBuilder";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const data: TradePickerData = {
  me: {
    rosterId: "1",
    teamName: "Mine",
    players: [{ id: "10", name: "My QB", position: "QB", nflTeam: "KC" }],
  },
  partners: [
    {
      rosterId: "2",
      teamName: "Chig-ers",
      players: [{ id: "20", name: "Their RB", position: "RB", nflTeam: null }],
    },
    { rosterId: "3", teamName: "Others", players: [] },
  ],
};

describe("TradeBuilder", () => {
  beforeEach(() => push.mockClear());

  it("asks for a partner before showing their players", () => {
    render(<TradeBuilder data={data} draft={{ partner: null, give: [], get: [] }} />);

    expect(screen.getByText("Pick a team to see their players.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear trade" })).toHaveProperty("disabled", true);
  });

  it("writes the picked partner to the URL and clears their old players", async () => {
    render(<TradeBuilder data={data} draft={{ partner: "2", give: ["10"], get: ["20"] }} />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "3");

    expect(push).toHaveBeenCalledWith("/trades?partner=3&give=10", { scroll: false });
  });

  it("toggles players on each side through the URL", async () => {
    render(<TradeBuilder data={data} draft={{ partner: "2", give: [], get: ["20"] }} />);

    const theirRb = screen.getByRole("button", { name: /Their RB/ });
    expect(theirRb.getAttribute("aria-pressed")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: /My QB/ }));
    expect(push).toHaveBeenLastCalledWith("/trades?partner=2&give=10&get=20", { scroll: false });

    await userEvent.click(theirRb);
    expect(push).toHaveBeenLastCalledWith("/trades?partner=2", { scroll: false });
  });

  it("clears the whole trade", async () => {
    render(<TradeBuilder data={data} draft={{ partner: "2", give: ["10"], get: [] }} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear trade" }));

    expect(push).toHaveBeenCalledWith("/trades", { scroll: false });
  });
});
