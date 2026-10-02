import type { Position } from "@/domain/entities/Player";

import { cn } from "@/lib/utils";

const positionStyles: Record<Position, string> = {
  QB: "bg-red-500/15 text-red-300",
  RB: "bg-blue-500/15 text-blue-300",
  WR: "bg-green-500/15 text-green-300",
  TE: "bg-orange-500/15 text-orange-300",
  K: "bg-yellow-500/15 text-yellow-300",
  DEF: "bg-violet-500/15 text-violet-300",
};

export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      className={cn(
        "inline-flex w-10 justify-center rounded-md py-0.5 text-xs font-semibold",
        positionStyles[position]
      )}
    >
      {position}
    </span>
  );
}
