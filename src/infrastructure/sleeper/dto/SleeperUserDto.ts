import { z } from "zod";

/**
 * Zod validation schema for Sleeper's user DTO.
 *
 * Note: Sleeper's metadata is inconsistent — only `team_name` is guaranteed
 * for our use case. Other fields (allow_pn, mention_pn, avatar) are ignored.
 */
export const SleeperUserDtoSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  avatar: z.string().nullable(),
  metadata: z
    .object({
      team_name: z.string().optional(),
    })
    .optional(),
});

export type SleeperUserDto = z.infer<typeof SleeperUserDtoSchema>;
