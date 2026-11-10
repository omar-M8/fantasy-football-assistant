"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  buildTradeHref,
  toggleId,
  type PickerPlayer,
  type TradePickerData,
} from "@/lib/trade-picker";
import { EMPTY_TRADE_DRAFT, type TradeDraft } from "@/lib/trade-search-params";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/dashboard/PositionBadge";

type TradeBuilderProps = {
  /** Teams and players, loaded on the server. */
  data: TradePickerData;
  /** The current selection, read from the URL on the server. */
  draft: TradeDraft;
};

/**
 * Partner dropdown and player chips. It keeps no trade state: every change navigates to a
 * new /trades URL, and the server re-renders the page (and this component) from it.
 */
export function TradeBuilder({ data, draft }: TradeBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const partner = data.partners.find((t) => t.rosterId === draft.partner) ?? null;
  const go = (next: TradeDraft) =>
    startTransition(() => router.push(buildTradeHref(next), { scroll: false }));

  const isEmpty = draft.partner === null && draft.give.length === 0 && draft.get.length === 0;

  return (
    <Card aria-busy={isPending}>
      <CardContent className={cn("space-y-5", isPending && "opacity-70")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs tracking-wider uppercase">
              Trade with
            </span>
            <select
              className="border-input bg-background dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2.5 outline-none focus-visible:ring-3"
              value={draft.partner ?? ""}
              onChange={(e) =>
                // A new partner means their players no longer apply.
                go({ ...draft, partner: e.target.value || null, get: [] })
              }
            >
              <option value="">Pick a team…</option>
              {data.partners.map((team) => (
                <option key={team.rosterId} value={team.rosterId}>
                  {team.teamName}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" disabled={isEmpty} onClick={() => go(EMPTY_TRADE_DRAFT)}>
            Clear trade
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <PlayerChips
            label="You send"
            players={data.me.players}
            selected={draft.give}
            onToggle={(id) => go({ ...draft, give: toggleId(draft.give, id) })}
          />
          {partner ? (
            <PlayerChips
              label={`You receive from ${partner.teamName}`}
              players={partner.players}
              selected={draft.get}
              onToggle={(id) => go({ ...draft, get: toggleId(draft.get, id) })}
            />
          ) : (
            <div>
              <ChipsLabel>You receive</ChipsLabel>
              <p className="text-muted-foreground text-sm">Pick a team to see their players.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChipsLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-muted-foreground mb-2 text-xs tracking-wider uppercase">{children}</h3>
  );
}

type PlayerChipsProps = {
  label: string;
  players: readonly PickerPlayer[];
  selected: readonly string[];
  onToggle: (playerId: string) => void;
};

function PlayerChips({ label, players, selected, onToggle }: PlayerChipsProps) {
  return (
    <div>
      <ChipsLabel>{label}</ChipsLabel>
      <ul className="flex flex-wrap gap-2" aria-label={label}>
        {players.map((player) => {
          const isSelected = selected.includes(player.id);
          return (
            <li key={player.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(player.id)}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-lg border py-1 pr-2.5 pl-1 text-sm outline-none focus-visible:ring-3",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground/90 hover:bg-muted"
                )}
              >
                <PositionBadge position={player.position} />
                <span>{player.name}</span>
                {player.nflTeam && (
                  <span className="text-muted-foreground text-xs">{player.nflTeam}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
