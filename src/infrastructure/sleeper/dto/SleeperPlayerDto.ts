import { z } from "zod";

/**
 * Zod validation schema for Sleeper's player DTO.
 *
 * Note: Sleeper's player data is inconsistent — some fields may be null or missing.
 */
export const SleeperPlayerDtoSchema = z.object({
  player_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  position: z.string(),
  team: z.string().nullable(),
  age: z.number(),
  height: z.string(),
  weight: z.string(),
  injury_status: z.string().nullable(),
  status: z.string().nullable(),
  number: z.number().nullable(),
});

export type SleeperPlayerDto = z.infer<typeof SleeperPlayerDtoSchema>;
