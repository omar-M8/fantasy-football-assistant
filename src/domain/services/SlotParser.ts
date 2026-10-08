import type { Player } from "@/domain/entities/Player";
import type { ParsedSlot } from "@/domain/entities/ParsedSlot";
import { isSlotType } from "@/domain/entities/SlotType";

/**
 * Parses a league's roster positions against a roster's starters array
 * into a typed lineup. Skips bench slots.
 *
 * @param rosterPositions - The league's slot config, e.g.
 *                          ["QB", "RB", "RB", "FLEX", "BN", ...]
 * @param starterIds      - The roster's starter IDs, index-aligned
 *                          with `rosterPositions`. Empty slots are "0".
 * @param players         - Player map, used to resolve positions.
 *
 * @throws If a roster position label is not a recognized SlotType.
 */

export function parseLineup(
  rosterPositions: readonly string[],
  starterIds: readonly string[],
  players: ReadonlyMap<string, Player>
): readonly ParsedSlot[] {
  const slots: ParsedSlot[] = [];

  // Iterate over the roster positions and starter IDs in parallel
  for (let i = 0; i < rosterPositions.length; i++) {
    const label = rosterPositions[i]; // Get the slot label (e.g., "FLEX", "WR", etc.)
    if (!isSlotType(label)) {
      throw new Error(`Unknown slot type: "${label}"`);
    }
    if (label === "BN") continue; // Bench slots are not starters

    const playerId = starterIds[i]; // Get the player ID for this slot
    const isEmpty = playerId === undefined || playerId === "0";

    if (isEmpty) {
      slots.push({ slotType: label, playerId: null, position: null });
      continue;
    }

    const player = players.get(playerId); // Look up the player in the map
    slots.push({
      slotType: label,
      playerId,
      position: player?.position ?? null,
    });
  }

  return slots;
}
