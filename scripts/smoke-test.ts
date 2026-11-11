import { sleeperClient } from "@/lib/sleeper-client";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import { buildSeasonPoints } from "@/domain/services/buildSeasonPoints";
import { loadRestOfSeasonPoints } from "@/application/use-cases/LoadRestOfSeasonPoints";
import { DEMO_LEAGUE_ID } from "@/config/demo";
import type { Position } from "@/domain/entities/Player";

const POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

async function main() {
  console.log("Fetching league data...");

  // Same data as /team: rest-of-season weekly points, or season projections when no weeks remain.
  const { league, rosters, players, weeklyPoints } = await loadRestOfSeasonPoints(
    { dataSource: sleeperClient },
    DEMO_LEAGUE_ID
  );
  const points =
    weeklyPoints ??
    buildSeasonPoints(
      await sleeperClient.getSeasonProjections(league.season),
      league.settings.scoringFormat
    );
  console.log(
    weeklyPoints
      ? `Grading on ${weeklyPoints.size} remaining weeks`
      : "Grading on season projections"
  );

  const teamNameById = new Map(rosters.map((r) => [r.rosterId, r.teamName]));

  console.log(
    `\nLeague: ${league.name} (${league.season}, week ${league.currentWeek}, ${league.teamCount} teams)\n`
  );

  for (const position of POSITIONS) {
    const grades = analyzePosition(position, league, rosters, players, points);

    console.log(`\n═════════════════════ ${position} ═════════════════════`);
    console.log(
      `  ${"Rank".padEnd(5)} ${"Team".padEnd(30)} ${"Grade".padEnd(6)} ${"Starters".padEnd(9)} ${"Start".padStart(8)} ${"Replace".padStart(9)} ${"Surplus".padStart(9)}`
    );

    for (const g of grades) {
      const teamName = teamNameById.get(g.rosterId) ?? "Unknown";
      console.log(
        `  ${String(g.rank).padEnd(5)} ${teamName.padEnd(30)} ${g.grade.padEnd(6)} ${String(g.starterCount).padEnd(9)} ${g.starterValue.toFixed(1).padStart(8)} ${g.replacementValue.toFixed(1).padStart(9)} ${g.surplusValue.toFixed(1).padStart(9)}`
      );
    }
  }

  console.log("\n");
}

main().catch(console.error);
