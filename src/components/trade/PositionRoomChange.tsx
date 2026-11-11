import type { PositionGradeChange } from "@/domain/services/tradePositionGrades";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/dashboard/PositionBadge";
import {
  formatGradeChange,
  getRankChangeTone,
  TONE_TEXT_CLASS,
} from "@/components/trade/tradeFormat";

type PositionRoomChangeProps = {
  changes: readonly PositionGradeChange[];
  /** The user's roster (team A) and the partner's. */
  myRosterId: string;
  partnerRosterId: string;
  partnerName: string;
};

/** Position grades (rest-of-season, as on My Team) that move because of the trade, for both teams. */
export function PositionRoomChange({
  changes,
  myRosterId,
  partnerRosterId,
  partnerName,
}: PositionRoomChangeProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Position grades</h2>
          <p className="text-muted-foreground text-sm">Rest-of-season grades, same as My Team.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TeamChanges label="You" changes={changes.filter((c) => c.rosterId === myRosterId)} />
          <TeamChanges
            label={partnerName}
            changes={changes.filter((c) => c.rosterId === partnerRosterId)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TeamChanges({
  label,
  changes,
}: {
  label: string;
  changes: readonly PositionGradeChange[];
}) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-2 truncate text-xs tracking-wider uppercase">
        {label}
      </h3>
      {changes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No grade changes.</p>
      ) : (
        <ul className="space-y-2">
          {changes.map((change) => (
            <li key={change.position} className="flex items-center gap-2 text-sm">
              <PositionBadge position={change.position} />
              <span
                className={cn(
                  "tabular-nums",
                  TONE_TEXT_CLASS[getRankChangeTone(change.before.rank, change.after.rank)]
                )}
              >
                {formatGradeChange(change)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
