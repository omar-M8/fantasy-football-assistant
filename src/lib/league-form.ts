/** What LeagueIdForm shows after a submit. Shared by the client form and the server action. */
export type LeagueFormState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string; readonly value: string }
  /** The league exists but isn't from the current NFL season; submitting again confirms. */
  | { readonly status: "warning"; readonly message: string; readonly leagueId: string };

export const INITIAL_LEAGUE_FORM_STATE: LeagueFormState = { status: "idle" };
