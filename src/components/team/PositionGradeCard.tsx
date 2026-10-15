import type { Player, Position } from "@/domain/entities/Player";
import type { PositionGrade } from "@/domain/entities/PositionGrade";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/team/PositionBadge";
import { RankBar } from "@/components/team/RankBar";

const positionNames: Record<Position, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  WR: "Wide Receiver",
  TE: "Tight End",
  K: "Kicker",
  DEF: "Defense",
};

const injuryStyles: Record<string, string> = {
  Questionable: "text-yellow-400",
  Doubtful: "text-orange-400",
  Out: "text-red-400",
  IR: "text-red-400",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function gradeColor(grade: PositionGrade["grade"]): string {
  if (grade.startsWith("A")) return "text-green-400";
  if (grade.startsWith("B")) return "text-violet-400";
  if (grade.startsWith("C")) return "text-yellow-400";
  if (grade.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

type PositionGradeCardProps = {
  grade: PositionGrade;
  players: readonly Player[];
  ppg?: number;
  takeaway?: string;
  weekProjections?: ReadonlyMap<string, number>;
};

export function PositionGradeCard({
  grade,
  players,
  ppg,
  takeaway,
  weekProjections,
}: PositionGradeCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <PositionBadge position={grade.position} />
          <h3 className="font-semibold">{positionNames[grade.position]}</h3>
          <div className="ml-auto flex items-center gap-3">
            <span className={cn("text-3xl font-semibold", gradeColor(grade.grade))}>
              {grade.grade}
            </span>
            <ChevronDown className="text-muted-foreground size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Starters" value={grade.starterCount.toString()} />
          <Stat label="Depth" value={players.length.toString()} />
          <Stat label="PPG" value={ppg !== undefined ? ppg.toFixed(1) : "—"} />
          <Stat label="Rank" value={`${ordinal(grade.rank)} of ${grade.teamCount}`} />
        </div>

        <div className="mt-4">
          <RankBar rank={grade.rank} teamCount={grade.teamCount} showLabels />
        </div>

        {takeaway !== undefined && <p className="text-foreground/80 mt-3 text-sm">{takeaway}</p>}

        <div className="border-border mt-4 border-t pt-4">
          {players.map((player) => (
            <PlayerRow
              key={player.playerId}
              player={player}
              weekProjection={weekProjections?.get(player.playerId)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px] tracking-wider uppercase">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function PlayerRow({
  player,
  weekProjection,
}: {
  player: Player;
  weekProjection: number | undefined;
}) {
  return (
    <div className="border-border border-b py-2.5 last:border-0">
      <div className={cn("flex items-center gap-2", player.status === "inactive" && "opacity-60")}>
        <PositionBadge position={player.position} />
        <span className="text-sm font-medium">{player.fullName}</span>
        <span className="text-muted-foreground text-xs">
          ({player.team ?? "FA"}) · #{player.number ?? "—"}
        </span>
        <div className="ml-auto flex shrink-0 gap-2 text-xs">
          {player.injuryStatus && (
            <span className={injuryStyles[player.injuryStatus] ?? "text-muted-foreground"}>
              {player.injuryStatus}
            </span>
          )}
          {player.status === "inactive" && <span className="text-red-400">Inactive</span>}
        </div>
      </div>
      <div className="text-muted-foreground ml-[3.25rem] text-xs">
        {weekProjection !== undefined && (
          <span>Week 4 Proj: {weekProjection.toFixed(1)} pts · </span>
        )}
        <span>Season Avg: —</span>
      </div>
    </div>
  );
}
