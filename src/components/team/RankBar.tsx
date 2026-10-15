type RankBarProps = {
  rank: number;
  teamCount: number;
  showLabels?: boolean;
};

export function RankBar({ rank, teamCount, showLabels = false }: RankBarProps) {
  const position = teamCount > 1 ? ((teamCount - rank) / (teamCount - 1)) * 100 : 50;

  return (
    <div className="w-full">
      <div className="bg-border relative h-1 rounded-full">
        <span
          className="bg-primary absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${position}%` }}
        />
      </div>
      {showLabels && (
        <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
          <span>Worst</span>
          <span>Best</span>
        </div>
      )}
    </div>
  );
}
