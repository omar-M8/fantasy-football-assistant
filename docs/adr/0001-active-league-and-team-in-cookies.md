# ADR 0001: Keep the active league and team in server-set cookies

- **Status:** Accepted
- **Date:** 2026-11-11
- **Introduced in:** `feat/user-team-selection`
- **Details:** [League and team selection](../architecture/league-and-team-selection.md)

## Context

Every page showed the demo team: the league came from a `league_id` cookie that the browser wrote itself, and the user was hard-coded as `DEMO_USER_ID`. Visitors need to view their own Sleeper team, without losing the demo.

Constraints:

- There are no accounts or logins. Sleeper league and user IDs are public.
- Pages are Server Components, so whatever holds the choice has to be readable on the server.
- The demo must stay the default and always be one click away.

## Decision

1. **Two cookies hold the choice:** `league_id` and `user_id`.
2. **Only server actions write them,** as `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production) that last a year. The browser no longer writes `league_id`.
3. **One function reads them:** `getActiveContext()` returns `{ leagueId, userId, isDemo }`.
   - No valid league → the demo league and team.
   - A league but no team → redirect to `/select-team`.
4. **The server checks every value before saving it.** The league must exist on Sleeper, and the user must own a roster in that league.
5. **The demo stays the default.** `backToDemo` clears both cookies; the banner, `/select-team`, and the home page's "Try the Demo" button all use it.

## Alternatives considered

| Option                                              | Why not                                                                                                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **League and user in the URL** (`?league=…&user=…`) | Every link and redirect would have to carry both. Easy to share, but easy to lose when navigating, and `/trades` already uses its query string for the trade itself. |
| **`localStorage`**                                  | Server Components can't read it, so pages would render the demo first and then switch on the client.                                                                 |
| **Keep browser-written cookies**                    | Scripts on the page could read and change them, and nothing checked the values before they reached Sleeper.                                                          |
| **Accounts (our own sign-in)**                      | The most complete option, but far more work. Not needed while all the data is public.                                                                                |

## Consequences

**Good:**

- Pages get the league and user from one place, and no page imports the demo IDs.
- Server-only cookies can't be changed by scripts on the page, and every value is checked before it's saved.
- Each mode is a pure function of two strings (`resolveActiveContext`), so it's simple to test.

**Costs and risks:**

- The choice is per browser. Clearing cookies or changing devices returns the visitor to the demo.
- `/select-team` must stay outside the `(app)` route group, or the layout's redirect would loop.
- Every `(app)` request reads the cookies, and the layout fetches the league name for the banner. That fetch is cached, and if it fails the banner says "Your league".
- Anyone can choose any public league and team. That's acceptable because the data is public, but it means the cookies identify a team, not a person.

**Revisit if** the app adds accounts, private data, or anything a visitor can change on Sleeper.
