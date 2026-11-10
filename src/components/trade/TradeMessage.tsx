import { Card, CardContent } from "@/components/ui/card";

type TradeMessageProps = {
  title: string;
  description?: string;
};

/** A centred message card for the empty state and for trades that can't be analyzed. */
export function TradeMessage({ title, description }: TradeMessageProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
