import type { SlotType } from "@/domain/entities/SlotType";
import type { Position } from "@/domain/entities/Player";

/**
 * A single slot in a parsed lineup.
 *
 * Produced by the SlotParser, which zips a league's `rosterPositions`
 * with a roster's `starterIds` and resolves each player's position.
 *
 * - `slotType` is what the league defines (e.g. "FLEX").
 * - `position` is what the player actually plays (e.g. "RB").
 *   They differ for flex slots.
 * - Both `playerId` and `position` are null when the slot is empty.
 */
export type ParsedSlot = {
  readonly slotType: SlotType;
  readonly playerId: string | null;
  readonly position: Position | null;
};
