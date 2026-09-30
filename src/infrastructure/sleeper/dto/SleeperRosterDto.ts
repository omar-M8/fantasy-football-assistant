import { z } from "zod";

const stringArray = z
  .array(z.string()) // Validate that the input is an array of strings
  .nullish() // Allow the input to be null or undefined
  .transform((v) => v ?? []); // Transform null or undefined to an empty array

/**
 * z validation schema for sleeper's roster messy DTO.
 *
 * note: sleeper's uses snake_case for their dto's, the mapper converts to our camelCase domain.
 */
export const SleeperRosterDtoSchema = z.object({
  roster_id: z.number(),
  owner_id: z.string(),
  players: stringArray,
  starters: stringArray,
  reserve: stringArray,
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
