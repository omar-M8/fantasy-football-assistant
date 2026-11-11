# Documentation

| Folder or file                                             | What goes there                                                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`architecture/`](architecture/)                           | How a part of the app works: flow, files, and rules to keep                                                                      |
| [`adr/`](adr/)                                             | Architecture decision records: one decision per file, numbered, never edited after acceptance (supersede with a new ADR instead) |
| [`trade-analyzer-progress.md`](trade-analyzer-progress.md) | Progress, decisions, and next steps for the trade analyzer                                                                       |

## Architecture

- [League and team selection](architecture/league-and-team-selection.md): demo mode vs. a visitor's own team, the league form, `/select-team`, and `getActiveContext()`.

## Decision records

| ADR                                                             | Decision                                              | Status   |
| --------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| [0001](adr/0001-active-league-and-team-in-cookies.md)           | Keep the active league and team in server-set cookies | Accepted |
| [0002](adr/0002-position-grades-use-rest-of-season-values.md)   | Position grades use rest-of-season weekly values      | Accepted |
| [0003](adr/0003-trade-page-grades-use-rest-of-season-values.md) | Trade-page grades use rest-of-season values           | Accepted |
