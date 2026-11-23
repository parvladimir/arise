"use client";

import { useEffect, useRef } from "react";
import { CreateCharacter } from "./CreateCharacter";
import { GameScreen } from "./GameScreen";
import { Menu } from "./Menu";
import { useAccount } from "./useAccount";
import { useGame } from "./useGame";

export function Game() {
  const { account, submit, logout } = useAccount();
  const game = useGame(account.status === "user" ? account.user : null);
  // Первый вход без сохранения: сразу к созданию персонажа, без лишнего экрана меню.
  const autoCreated = useRef(false);
  const fresh = account.status === "user" && game.synced && !game.hasSave && game.screen === "menu";
  useEffect(() => {
    if (fresh && !autoCreated.current) {
      autoCreated.current = true;
      game.setScreen("create");
    }
  }, [fresh, game]);
  if (account.status === "loading" || (account.status === "user" && !game.synced)) {
    return <main className="grid min-h-dvh place-items-center text-muted">…</main>;
  }
  if (account.status === "guest") return <Menu game={game} auth={submit} />;
  if (game.screen === "create") return <CreateCharacter game={game} />;
  if (game.screen === "game" && game.state) return <GameScreen game={game} state={game.state} />;
  return <Menu game={game} logout={() => { game.flush(); game.reset(true); void logout(); }} />;
}
