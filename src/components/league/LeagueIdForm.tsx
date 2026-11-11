"use client";

import { useActionState } from "react";

import { submitLeagueId } from "@/app/actions/league";
import { INITIAL_LEAGUE_FORM_STATE } from "@/lib/league-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Lets a visitor enter their Sleeper league ID (or paste the league URL). The server action
 * checks the league exists, then sends them to /select-team to pick their team.
 */
export function LeagueIdForm() {
  const [state, formAction, pending] = useActionState(submitLeagueId, INITIAL_LEAGUE_FORM_STATE);

  const value =
    state.status === "error" ? state.value : state.status === "warning" ? state.leagueId : "";

  return (
    <form action={formAction} className="w-full max-w-md">
      <div className="flex gap-2">
        <Input
          // Remount on each result so the field shows what was submitted.
          key={JSON.stringify(state)}
          id="league-id-input"
          name="leagueId"
          defaultValue={value}
          placeholder="Enter your Sleeper league ID"
          aria-label="Sleeper league ID"
          aria-invalid={state.status === "error"}
          aria-describedby="league-id-help"
          disabled={pending}
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Checking…" : "Try My League"}
        </Button>
      </div>

      <div id="league-id-help" aria-live="polite" className="mt-2 text-xs">
        {state.status === "error" && <p className="text-destructive">{state.message}</p>}
        {state.status === "warning" && (
          <div className="space-y-2">
            <p className="text-foreground">{state.message}</p>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              name="confirmSeason"
              value={state.leagueId}
              disabled={pending}
            >
              Use it anyway
            </Button>
          </div>
        )}
        {state.status === "idle" && (
          <p className="text-muted-foreground">
            Find your league ID in the Sleeper app URL: sleeper.com/leagues/[ID]/team
          </p>
        )}
      </div>
    </form>
  );
}
