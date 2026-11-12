# FF Assistant

A fantasy football co-pilot for [Sleeper](https://sleeper.com) leagues. It grades your roster position by position against the rest of your league, and tells you whether a trade actually helps your team over the rest of the regular season.

Try it with the built-in demo team, or enter your own Sleeper league ID and pick your team. No account needed.

> Not affiliated with Sleeper. Uses Sleeper's public API, which needs no key.

## Features

| Page                                        | What it does                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** (`/dashboard`)                | Your roster: starters, bench and reserve, with record and points.                                                                                                                            |
| **My Team** (`/team`)                       | A letter grade (A+ to F) for each position, ranked against every team in your league by points above replacement level.                                                                      |
| **Trades** (`/trades`)                      | Pick a trade partner and players. You get a verdict, each team's weekly gain, a fairness score, the reasons behind it, how your lineup and each week change, and which position grades move. |
| **Your league** (home page, `/select-team`) | Enter a league ID (or paste the league URL) and choose your team. "Back to demo" returns to the demo team at any time.                                                                       |

The home page also lists features that are planned but not built yet: start/sit help, waiver radar, FAAB bids, a weekly briefing, and bench alerts.

### How values are calculated

Grades and trades use the same numbers:

1. **Remaining weeks:** the rest of the regular season, not counting the current week.
2. **Weekly projections** from Sleeper, in your league's scoring format (standard, half PPR or PPR). A player with no projection that week (for example, on bye) counts as 0.
3. **Best lineup each week:** each team's optimal lineup is rebuilt every week from its roster.
4. **Replacement level:** the best free agents available at each position that week.

- **Trades:** a trade's value is the change in your team's weekly points.
- **Grades:** a grade is your rank in the league by average points per week above replacement level. If a starter is on bye and you have no backup, grades assume you'd pick up a free agent that week.
- **After the regular season:** grades fall back to season-long projections, and the page says so.

The details and the reasoning are in [`docs/`](docs/).

## Getting started

Requires **Node.js 20.9 or later**.

```bash
git clone https://github.com/omar-M8/fantasy-football-assistant.git
cd fantasy-football-assistant
npm install
npm run dev
```

Open <http://localhost:3000> and click **Try the Demo**, or enter your Sleeper league ID. Your league ID is in the Sleeper URL: `sleeper.com/leagues/<ID>/team`.

No environment variables are needed. The demo league and team are set in [`src/config/demo.ts`](src/config/demo.ts).

## Scripts

| Command                           | What it does                              |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Start the dev server                      |
| `npm run build`                   | Production build                          |
| `npm start`                       | Serve the production build                |
| `npm test`                        | Run the unit tests (Vitest)               |
| `npm run test:watch`              | Run tests in watch mode                   |
| `npm run typecheck`               | Type-check with TypeScript                |
| `npm run lint`                    | Lint with ESLint                          |
| `npm run format` / `format:check` | Format with Prettier, or check formatting |

> On a fresh clone, run `npm run build` once before `npm run typecheck`. Type-checking uses route types that Next.js generates during the build; without them it fails with `Cannot find name 'LayoutProps'`.

A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions) and React 19
- TypeScript
- Tailwind CSS 4 and [shadcn/ui](https://ui.shadcn.com) components
- [Zod](https://zod.dev) to validate Sleeper API responses and URL parameters
- Vitest and Testing Library for tests

> This project uses Next.js 16, which changes some APIs from earlier versions. The docs for the installed version are in `node_modules/next/dist/docs/`. See [`AGENTS.md`](AGENTS.md).

## Project structure

The code is layered so the fantasy-football logic doesn't depend on Sleeper or on React.

```text
src/
├── domain/           # Pure logic: entities, lineups, team value, trade evaluation, grades
├── application/      # Use cases (AnalyzeTrade, GetTeamAnalysis, …) and ports (FantasyDataSource)
├── infrastructure/   # Sleeper API client, response mappers, caching
├── lib/              # App-level helpers: active league/team, URL parsing, view models
├── components/       # UI: dashboard, team, trade, league, layout, ui (shadcn)
├── app/              # Next.js routes, layouts and server actions
└── config/           # Demo league and team
tests/unit/           # Mirrors src/ (domain, application, infrastructure, lib, components)
docs/                 # Architecture docs, decision records, progress notes
scripts/              # Dev scripts that print grades for the demo league
```

- **Dependencies point inward:** `domain` imports nothing from the other layers, and `application` talks to Sleeper only through the `FantasyDataSource` port.
- **Swapping the data source** (for example, to another fantasy platform) means writing a new adapter in `infrastructure/`.

## Documentation

Start with the [docs index](docs/README.md):

- **[League and team selection](docs/architecture/league-and-team-selection.md):** demo mode vs. your own team, cookies, and the server actions.
- **[Trade analyzer progress](docs/trade-analyzer-progress.md):** how trades are evaluated, the key decisions, and next steps.
- **Decision records** (`docs/adr/`):
  - [0001](docs/adr/0001-active-league-and-team-in-cookies.md): keep the active league and team in cookies
  - [0002](docs/adr/0002-position-grades-use-rest-of-season-values.md): grades use rest-of-season values
  - [0003](docs/adr/0003-trade-page-grades-use-rest-of-season-values.md): the trade page's grades do too

## Contributing

- **Branches:** one branch per change, created from an up-to-date `main`, with [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `refactor:`, `docs:`, …).
- **Before opening a PR:** `typecheck`, `lint`, `test` and `build` must all pass.
- **PRs are squash-merged,** so don't base a branch on another unmerged branch. Wait for the previous PR to merge, then branch from `main`. Commits pushed to a branch after it's merged don't reach `main`.
- **Decision records:** a significant decision gets an ADR in `docs/adr/`. Accepted ADRs aren't rewritten; a new one amends or replaces them.

## Known limitations

- **Teams with no owner:** a league with an abandoned team (no owner) currently fails to load its rosters.
- **No accounts:** your league and team choice is stored in your browser. Clearing cookies or switching devices returns you to the demo.
- **Scoring:** values use Sleeper's projections for standard, half PPR and PPR scoring. Custom scoring rules (TE premium, first-down points, and so on) aren't modeled yet.
