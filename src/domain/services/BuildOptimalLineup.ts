import type { ParsedSlot } from "@/domain/entities/ParsedSlot";
import type { Player, Position } from "@/domain/entities/Player";
import { isSlotType, SLOT_ELIGIBILITY, type SlotType } from "@/domain/entities/SlotType";

export function buildOptimalLineup(
  rosterPositions: readonly string[],
  availablePlayerIds: readonly string[],
  players: ReadonlyMap<string, Player>,
  projectedPoints: ReadonlyMap<string, number>
): readonly ParsedSlot[] {
  const usedPlayerIds = new Set<string>();
  const slots: (ParsedSlot | undefined)[] = new Array(rosterPositions.length); // Initialized an array that can hold ParsedSlot or undefined

  for (let i = 0; i < rosterPositions.length; i++) {
    const label = rosterPositions[i]; //
    if (!isSlotType(label) || label == "BN") continue; //If the position is not a position defined or its a Bench position skip it
    if (SLOT_ELIGIBILITY[label].length !== 1) continue; // Check the the key in the SLOT_ELIGIBILITY object has only one position associated with it, if not skip it
    slots[i] = fillSlot(label, availablePlayerIds, players, projectedPoints, usedPlayerIds);
  }

  for (let i = 0; i < rosterPositions.length; i++) {
    const label = rosterPositions[i];
    if (!isSlotType(label) || label == "BN") continue;
    if (SLOT_ELIGIBILITY[label].length === 1) continue;
    slots[i] = fillSlot(label, availablePlayerIds, players, projectedPoints, usedPlayerIds);
  }
  return slots.filter((slot): slot is ParsedSlot => !!slot);
}

function fillSlot(
  slotType: SlotType,
  availablePlayerIds: readonly string[], // The list of player IDs that are available to fill the slot
  players: ReadonlyMap<string, Player>,
  projectedPoints: ReadonlyMap<string, number>,
  usedPlayerIds: Set<string>
): ParsedSlot {
  const eligiblePositions = SLOT_ELIGIBILITY[slotType];
  let bestPlayerId: string | null = null; // Initialize the best player ID to null, null = null means no player has been found yet
  let bestPosition: Position | null = null; // Initialize the best position to null, null = null means no position has been found yet
  let bestProjection = -Infinity; // Initialize the best projection to negative infinity, so any valid projection will be better

  for (const playerId of availablePlayerIds) {
    if (usedPlayerIds.has(playerId)) continue; // If the player has already been used, skip them
    const player = players.get(playerId); // Get the player object from the players map
    if (!player) continue;
    if (!eligiblePositions.includes(player.position)) continue; // If the player's position is not eligible for this slot, skip them

    const proj = projectedPoints.get(playerId) ?? 0;
    if (proj > bestProjection) {
      bestProjection = proj;
      bestPlayerId = playerId;
      bestPosition = player.position;
    }
  }

  if (bestPlayerId === null) {
    return { slotType, playerId: null, position: null }; // If no eligible player was found, return a ParsedSlot with null values
  }

  usedPlayerIds.add(bestPlayerId);
  return { slotType, playerId: bestPlayerId, position: bestPosition }; // Return the best player found for this slot
}
