import { z } from "zod";

export const PlayerProjectionDtoSchema = z.object({
  player_id: z.string(),
  stats: z
    .looseObject({
      points_ppr: z.number().optional(),
      points_half_ppr: z.number().optional(),
      points_std: z.number().optional(),
    })
    .nullable(),
});

export type PlayerProjectionDto = z.infer<typeof PlayerProjectionDtoSchema>;
