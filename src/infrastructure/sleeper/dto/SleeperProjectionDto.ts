import { z } from "zod";
/**
 * Zod Schema for a single entry in sleeper's player projections array.
 *
 * Sleeper returns ~9,400 entries, but only ~1,450 have actual
 * projected points. Players without projections have a `stats`
 * object containing only ADP data — no `pts_*` fields. We mark
 * the point fields optional so those entries still parse.
 *
 * `z.looseObject()` keeps other stat fields (rush_yd, rec, etc.)
 * accessible without declaring all 40+ of them.
 */
export const SleeperProjectionDtoSchema = z.object({
  player_id: z.string(),
  stats: z
    .looseObject({
      pts_ppr: z.number().optional(),
      pts_half_ppr: z.number().optional(),
      pts_std: z.number().optional(),
    })
    .nullable(),
});

export type SleeperPlayerProjectionDto = z.infer<typeof SleeperProjectionDtoSchema>;
