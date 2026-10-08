import { z } from "zod";

/**
 * Zod schema for Sleeper's league DTO.
 *
 * Sleeper splits league config across three objects:
 * - Top level: identity, roster_positions, total_rosters
 * - `settings`: league state (leg = current week)
 * - `scoring_settings`: point values per stat
 *
 * Only declares fields we consume.
 */
export const SleeperLeagueDtoSchema = z.object({
  league_id: z.string(),
  name: z.string(),
  season: z.string(),
  total_rosters: z.number(),
  roster_positions: z.array(z.string()), // e.g. ["QB", "RB", "WR", "TE", "FLEX", "BN"]
  settings: z
    .looseObject({
      leg: z.number().optional(), // current week (0 if league hasn't started yet)
    })
    .nullable(),
  scoring_settings: z
    .looseObject({
      rec: z.number(), // receptions scoring (0, 0.5, or 1)
    })
    .nullable(),
});

export type SleeperLeagueDto = z.infer<typeof SleeperLeagueDtoSchema>;
