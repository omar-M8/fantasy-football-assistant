import type { Player } from "@/domain/entities/Player";

import { PlayerRow } from "@/components/dashboard/PlayerRow";
import { Card, CardContent } from "@/components/ui/card";

export function PlayerList({ title, players }: { title: string; players: Player[] }) {
  if (players.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
      <Card>
        <CardContent className="px-4 py-2">
          {players.map((player) => (
            <PlayerRow key={player.playerId} player={player} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
