import { z } from "zod";

/**
 * z validation schema for sleeper's roster messy DTO.
 *
 * note: sleeper's uses snake_case for their dto's, the mapper converts to our camelCase domain.
 */

export const SleeperRosterDtoSchema = z.object({
  roster_id: z.number(),
  owner_id: z.string(),
  players: z.array(z.string()).nullable().default([]),
  starters: z.array(z.string()).nullable().default([]),
  reserve: z.array(z.string()).nullable().default([]),
  settings: z.object({
    wins: z.number(),
    losses: z.number(),
    ties: z.number(),
    fpts: z.number(),
    fpts_against: z.number(),
  }),
});

// TypeScript type for the SleeperRosterDto based on the zod schema
export type SleeperRosterDto = z.infer<typeof SleeperRosterDtoSchema>;
