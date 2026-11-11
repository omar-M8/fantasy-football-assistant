/** Cookie names. Set and cleared only by the server actions in src/app/actions/league.ts. */
export const LEAGUE_COOKIE = "league_id";
export const USER_COOKIE = "user_id";

/** Sleeper league and user IDs are long numeric strings. */
export const SLEEPER_ID_PATTERN = /^\d{1,32}$/;
