import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEMO_LEAGUE_ID, DEMO_USER_ID } from "@/config/demo";

const cookieValues = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieValues.has(name) ? { name, value: cookieValues.get(name)! } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { getActiveContext, resolveActiveContext } = await import("@/lib/active-context");

const LEAGUE = "1180000000000000000";
const USER = "870000000000000000";

describe("resolveActiveContext", () => {
  it("uses the demo league and team when no league is chosen", () => {
    expect(resolveActiveContext({})).toEqual({
      status: "ready",
      context: { leagueId: DEMO_LEAGUE_ID, userId: DEMO_USER_ID, isDemo: true },
    });
  });

  it("ignores a leftover user cookie when no league is chosen", () => {
    expect(resolveActiveContext({ userId: USER })).toMatchObject({
      context: { isDemo: true, userId: DEMO_USER_ID },
    });
  });

  it("treats a malformed league cookie as no league", () => {
    expect(resolveActiveContext({ leagueId: "abc", userId: USER })).toMatchObject({
      context: { isDemo: true },
    });
  });

  it("asks for a team when a league is chosen but no team is", () => {
    expect(resolveActiveContext({ leagueId: LEAGUE })).toEqual({
      status: "needs_team",
      leagueId: LEAGUE,
    });
    expect(resolveActiveContext({ leagueId: LEAGUE, userId: "<script>" })).toMatchObject({
      status: "needs_team",
    });
  });

  it("uses the visitor's league and team when both are chosen", () => {
    expect(resolveActiveContext({ leagueId: LEAGUE, userId: USER })).toEqual({
      status: "ready",
      context: { leagueId: LEAGUE, userId: USER, isDemo: false },
    });
  });
});

describe("getActiveContext", () => {
  beforeEach(() => cookieValues.clear());

  it("reads the cookies and returns the demo context by default", async () => {
    expect(await getActiveContext()).toMatchObject({ isDemo: true });
  });

  it("returns the visitor's league and team from the cookies", async () => {
    cookieValues.set("league_id", LEAGUE);
    cookieValues.set("user_id", USER);

    expect(await getActiveContext()).toEqual({ leagueId: LEAGUE, userId: USER, isDemo: false });
  });

  it("redirects to /select-team when a league is chosen but no team", async () => {
    cookieValues.set("league_id", LEAGUE);

    await expect(getActiveContext()).rejects.toThrow("REDIRECT /select-team");
  });
});
