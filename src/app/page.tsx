import {
  AlertTriangle,
  ArrowLeftRight,
  Crosshair,
  DollarSign,
  Newspaper,
  Radar,
} from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { LeagueIdForm } from "@/components/league/LeagueIdForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: ArrowLeftRight,
    title: "Trade Analyzer",
    description: "Value trades by positional scarcity, not raw points.",
  },
  {
    icon: Crosshair,
    title: "Start/Sit Co-Pilot",
    description: "Boom/bust or safe floor — adjusted to your matchup.",
  },
  {
    icon: Radar,
    title: "Waiver Radar",
    description: "Trending adds filtered by your roster's actual gaps.",
  },
  {
    icon: DollarSign,
    title: "FAAB Recommender",
    description: "Optimal bids based on your league's bidding history.",
  },
  {
    icon: Newspaper,
    title: "Weekly Briefing",
    description: "Three things to fix before kickoff, every Thursday.",
  },
  {
    icon: AlertTriangle,
    title: "Bench Landmine Alerts",
    description: "Know when your opponent is about to get burned.",
  },
];

export default function Home() {
  return (
    <Container>
      <section className="py-20 text-center sm:py-28">
        <Badge variant="secondary" className="mb-4">
          Fantasy Football Assistant
        </Badge>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Win your league, not just your matchup.
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
          Trade analysis, waiver targets, and start/sit intelligence — built for your specific
          roster.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/matchups">Try the Demo</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#">View on GitHub</Link>
          </Button>
        </div>

        <div id="league-id" className="mt-12 flex flex-col items-center">
          <p className="text-muted-foreground mb-3 text-sm">Or try it with your own league</p>
          <LeagueIdForm />
        </div>
      </section>

      <section className="py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="shadow-sm">
              <CardHeader>
                <div className="bg-secondary text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-md">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
