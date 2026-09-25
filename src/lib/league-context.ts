import { cookies } from "next/headers";
import { DEMO_LEAGUE_ID } from "@/config/demo";

/**
 * Returns the league ID the app should currently display.
 * Reads the "league_id" cookie if present, otherwise falls back
 * to the demo league.
 *
 * @async
 * @function getActiveLeagueId
 * @returns {Promise<string>} A promise that resolves to the active league ID.
 */
export async function getActiveLeagueId(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("league_id")?.value ?? DEMO_LEAGUE_ID;
}
