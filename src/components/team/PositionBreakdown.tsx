import type { Player, Position } from "@/domain/entities/Player";
import type { PositionGrade } from "@/domain/entities/PositionGrade";

import { PositionGradeCard } from "@/components/team/PositionGradeCard";

type PositionBreakdownProps = {
  grades: readonly PositionGrade[];
  playersByPosition: ReadonlyMap<Position, readonly Player[]>;
  ppgByPosition?: ReadonlyMap<Position, number>;
  takeawaysByPosition?: ReadonlyMap<Position, string>;
  weekProjections?: ReadonlyMap<string, number>;
};

export function PositionBreakdown({
  grades,
  playersByPosition,
  ppgByPosition,
  takeawaysByPosition,
  weekProjections,
}: PositionBreakdownProps) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-4 text-xs font-semibold tracking-wider uppercase">
        Position Breakdown
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {grades.map((grade) => (
          <PositionGradeCard
            key={grade.position}
            grade={grade}
            players={playersByPosition.get(grade.position) ?? []}
            ppg={ppgByPosition?.get(grade.position)}
            takeaway={takeawaysByPosition?.get(grade.position)}
            weekProjections={weekProjections}
          />
        ))}
      </div>
    </section>
  );
}
