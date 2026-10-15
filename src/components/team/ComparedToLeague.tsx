import type { PositionGrade } from "@/domain/entities/PositionGrade";

import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/team/PositionBadge";
import { RankBar } from "@/components/team/RankBar";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function ComparedToLeague({ grades }: { grades: readonly PositionGrade[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Compared to League
        </h2>
        <div className="mt-5 space-y-4">
          {grades.map((grade) => (
            <div
              className="grid items-center gap-x-4 gap-y-2 sm:grid-cols-[3rem_10rem_minmax(0,1fr)]"
              key={grade.position}
            >
              <PositionBadge position={grade.position} />
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold">{grade.surplusValue.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs">{ordinal(grade.rank)} best</span>
              </div>
              <RankBar rank={grade.rank} teamCount={grade.teamCount} />
            </div>
          ))}
        </div>
        <div className="text-muted-foreground mt-3 flex justify-between pl-0 text-[10px] sm:pl-[15.5rem]">
          <span>Worst</span>
          <span>Best</span>
        </div>
      </CardContent>
    </Card>
  );
}
