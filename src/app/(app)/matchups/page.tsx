import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";

export default function MatchupsPage() {
  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title="Weekly Matchups" description="Week 1 · Demo League" />
      <Card>
        <div className="text-muted-foreground flex items-center justify-center py-20">
          Matchup data coming soon.
        </div>
      </Card>
    </Container>
  );
}
