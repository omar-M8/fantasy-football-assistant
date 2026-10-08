import type { Position } from "@/domain/entities/Player";

/**
 * Sleeper's slot labels for roster positions. Used in the
 * `roster_positions` array and mirrored here so the parser can
 * dispatch on them.
 *
 * "BN" (bench) is included so the parser can recognize and skip it,
 * but it never holds starters.
 */
export type SlotType =
  "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "FLEX" | "WRRB_FLEX" | "REC_FLEX" | "SUPER_FLEX" | "BN";

/**
 * Which positions are eligible to fill each slot type.
 * Bench has no eligible positions — it's a marker, not a starter slot.
 *
 * Using `Record<SlotType, ...>` (not `Map`) so TypeScript enforces
 * that every slot type has an entry. Adding a new SlotType forces
 * us to update this table.
 */
export const SLOT_ELIGIBILITY: Record<SlotType, readonly Position[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  K: ["K"],
  DEF: ["DEF"],
  FLEX: ["RB", "WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  BN: [],
};

/**
 * Type guard: narrows a string to a SlotType if it's a known label.
 */
export function isSlotType(value: string): value is SlotType {
  return value in SLOT_ELIGIBILITY;
}
