import { z } from "zod";

/**
 * Zod schema for Sleeper's `/state/nfl` response.
 *
 * Only declares fields we consume.
 */
export const SleeperNflStateDtoSchema = z.object({
  season: z.string(),
  week: z.number(),
  season_type: z.string(),
});

export type SleeperNflStateDto = z.infer<typeof SleeperNflStateDtoSchema>;
