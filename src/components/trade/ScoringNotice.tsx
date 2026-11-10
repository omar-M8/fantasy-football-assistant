import { Info } from "lucide-react";

/**
 * A slim info strip for leagues whose scoring the projections don't model.
 * Presentational only: the page decides whether there's a message to show.
 */
export function ScoringNotice({ message }: { message: string }) {
  return (
    <div className="bg-muted text-muted-foreground border-border flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
