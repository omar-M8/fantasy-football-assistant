import { z } from "zod";

/**
 * Zod validation schema for Sleeper's player DTO.
 *
 * Sleeper's player data is messy:
 * - Team defenses (position "DEF") have a much sparser shape than
 *   regular players — many identity fields are missing.
 * - Retired/incomplete entries sometimes have `position: null`.
 * We normalize all missing fields to safe defaults at the boundary.
 */
export const SleeperPlayerDtoSchema = z.object({
  player_id: z.string(),
  first_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  last_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  full_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  position: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  team: z.string().nullable(),
  age: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  height: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  weight: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  injury_status: z.string().nullable(),
  status: z
    .string()
    .nullish()
    .transform((v) => v ?? "Inactive"),
  number: z
    .number()
    .nullish()
    .transform((v) => v ?? null),
});

export type SleeperPlayerDto = z.infer<typeof SleeperPlayerDtoSchema>;
