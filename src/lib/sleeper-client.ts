import { SleeperClient } from "@/infrastructure/sleeper/SleeperClient";
import { InMemoryCache } from "@/infrastructure/cache/InMemoryCache";

const SLEEPER_BASE_URL = "https://api.sleeper.app/v1";
const SLEEPER_PROJECTIONS_BASE_URL = "https://api.sleeper.app";

/**
 * Singleton Sleeper Client. The rest of the app imports this - never
 * constructs its own - so we have one shared instance to cache against later
 */
export const sleeperClient = new SleeperClient(
  SLEEPER_BASE_URL,
  SLEEPER_PROJECTIONS_BASE_URL,
  new InMemoryCache()
);
