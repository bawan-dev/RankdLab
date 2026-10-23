import type { Player } from "./types";

// Product identity, not hitbox identity: Fennec also has the Octane hitbox.
// Sources: ballchasing.com/doc/api and hackage.haskell.org/package/octane-0.11.0
// (library/Octane/Data/Bodies.hs).
const bodies: Record<number, { name: string; model: string }> = {
  23: { name: "Octane", model: "octane" },
  4284: { name: "Fennec", model: "fennec" },
  403: { name: "Dominus", model: "dominus" },
  22: { name: "Breakout", model: "breakout" },
  30: { name: "Merc", model: "merc" },
};

export function carBody(
  player: Pick<Player, "car_body_id" | "car_hitbox_family">,
) {
  const known =
    player.car_body_id == null ? undefined : bodies[player.car_body_id];
  return (
    known ?? {
      name:
        player.car_body_id == null
          ? "Body unavailable"
          : `Body #${player.car_body_id}`,
      model: "generic",
    }
  );
}
