import { z } from "zod";

/** The trade encoded in the /trades URL: ?partner=<rosterId>&give=<id,id>&get=<id>. */
export type TradeSearchParams = {
  readonly partner: string;
  readonly give: readonly string[];
  readonly get: readonly string[];
};

export type ParsedTradeSearchParams =
  | { readonly status: "empty" } // nothing chosen yet: a first visit
  | { readonly status: "invalid"; readonly message: string } // a broken or hand-edited URL
  | { readonly status: "ok"; readonly trade: TradeSearchParams };

/** Most trades are 1–3 players a side; this only stops absurd URLs. */
const MAX_PLAYERS_PER_SIDE = 10;

/** Sleeper player IDs are numeric, except team defenses, which use the team code (e.g. "WAS"). */
const playerId = z
  .string()
  .regex(/^[A-Za-z0-9]+$/, "Player IDs can only contain letters and digits");

/** Next gives a repeated key as an array (?give=1&give=2). Treat it like ?give=1,2. */
const joinRepeated = (value: unknown) => (Array.isArray(value) ? value.join(",") : value);

/** "1, 2,,2" → ["1", "2"]: split, trim, drop blanks and duplicates. */
const idList = z.preprocess(
  joinRepeated,
  z
    .string()
    .optional()
    .transform((value) => [
      ...new Set(
        (value ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ])
    .pipe(
      z.array(playerId).max(MAX_PLAYERS_PER_SIDE, `At most ${MAX_PLAYERS_PER_SIDE} players a side`)
    )
);

const schema = z.object({
  partner: z.string().regex(/^\d+$/, "Trade partner must be a roster ID").optional(),
  give: idList,
  get: idList,
});

/**
 * Parses and validates the /trades search params. Never throws: anything unusable comes
 * back as "empty" or "invalid" so the page can show its empty state.
 *
 * Only checks the URL's shape. Whether the players are on the right teams is checked
 * later, once rosters are loaded.
 */
export function parseTradeSearchParams(
  raw: Record<string, string | string[] | undefined>
): ParsedTradeSearchParams {
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { status: "invalid", message: result.error.issues[0]?.message ?? "Invalid trade link" };
  }

  const { partner, give, get } = result.data;
  if (partner === undefined && give.length === 0 && get.length === 0) return { status: "empty" };
  if (partner === undefined) return { status: "invalid", message: "Pick a trade partner" };
  if (give.length === 0 && get.length === 0) {
    return { status: "invalid", message: "Add at least one player to the trade" };
  }

  return { status: "ok", trade: { partner, give, get } };
}
