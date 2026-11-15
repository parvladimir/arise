"use client";

import { CreateCharacter } from "./CreateCharacter";
import { GameScreen } from "./GameScreen";
import { Menu } from "./Menu";
import { useGame } from "./useGame";

export function Game() {
  const game = useGame();
  if (game.screen === "create") return <CreateCharacter game={game} />;
  if (game.screen === "game" && game.state) return <GameScreen game={game} state={game.state} />;
  return <Menu game={game} />;
}
