import { sleeperClient } from "@/lib/sleeper-client";
import { analyzePosition } from "@/domain/services/PositionAnalyzer";
import { DEMO_LEAGUE_ID } from "@/config/demo";
import type { Position } from "@/domain/entities/Player";

const POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

async function main() {
  console.log("Fetching league data...");

  const [league, rosters, players] = await Promise.all([
    sleeperClient.getLeague(DEMO_LEAGUE_ID),
    sleeperClient.getRosters(DEMO_LEAGUE_ID),
    sleeperClient.getPlayers(),
  ]);

  const projections = await sleeperClient.getSeasonProjections(league.season);

  const teamNameById = new Map(rosters.map((r) => [r.rosterId, r.teamName]));

  console.log(
    `\nLeague: ${league.name} (${league.season}, week ${league.currentWeek}, ${league.teamCount} teams)\n`
  );

  for (const position of POSITIONS) {
    const grades = analyzePosition(position, league, rosters, players, projections);

    console.log(`\n========== ${position} ==========`);
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
