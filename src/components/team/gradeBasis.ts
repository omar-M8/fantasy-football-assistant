import type { GradeBasis } from "@/application/use-cases/GetTeamAnalysis";

/** The note under the grades and the unit for surplus values, for the basis they were graded on. */
export function describeGradeBasis(basis: GradeBasis): { note: string; unit: string } {
  if (basis.kind === "season") return { note: "Based on season projections", unit: "pts" };
  const weeks = basis.weeks === 1 ? "1 remaining week" : `${basis.weeks} remaining weeks`;
  return { note: `Based on ${weeks}`, unit: "pts/wk" };
}
