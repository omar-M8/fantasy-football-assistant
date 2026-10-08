import { sleeperClient } from "../src/lib/sleeper-client";
import { getDashboardData } from "../src/application/use-cases/GetDashboardData";
import { DEMO_LEAGUE_ID, DEMO_USER_ID } from "@/config/demo";

const LEAGUE_ID = DEMO_LEAGUE_ID;
const USER_ID = DEMO_USER_ID;

async function main() {
  const data = await getDashboardData({ dataSource: sleeperClient }, LEAGUE_ID, USER_ID);

  if (!data) {
    console.log("No roster found for this user in this league.");
    return;
  }

  console.log(`Team: ${data.roster.teamName}`);
  console.log(`Record: ${data.roster.wins}-${data.roster.losses}-${data.roster.ties}`);
  console.log(`Points For: ${data.roster.pointsFor}`);
  console.log("");
  console.log("Starters:");
  for (const p of data.starters) {
    console.log(`  ${p.position}  ${p.fullName}  (${p.team ?? "FA"})`);
  }

  console.log("\nLoading projections...");
  const projections = await sleeperClient.getSeasonProjections("2026");
  console.log(`Loaded ${projections.size} player projections`);

  const gibbs = projections.get("9221");
  console.log("Jahmyr Gibbs:", gibbs);

  console.log("\nLoading league...");
  const league = await sleeperClient.getLeague(LEAGUE_ID);
  console.log("League:", league.name);
  console.log("Season:", league.season);
  console.log("Week:", league.currentWeek);
  console.log("Teams:", league.teamCount);
  console.log("Scoring:", league.settings.scoringFormat);
  console.log("Roster positions:", league.settings.rosterPositions);
}

main().catch(console.error);
