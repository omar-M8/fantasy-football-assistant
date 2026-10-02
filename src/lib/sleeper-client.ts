import { SleeperClient } from "@/infrastructure/sleeper/SleeperClient";

const SLEEPER_BASE_URL = "https://api.sleeper.app/v1";

/**
 * Singleton Sleeper Client. The rest of the app imports this - never
 * constructs its own - so we have one shared instance to cache against later
 */
export const sleeperClient = new SleeperClient(SLEEPER_BASE_URL);
