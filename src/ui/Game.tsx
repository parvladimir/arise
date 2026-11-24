"use client";

import { useEffect, useRef } from "react";
import { CreateCharacter, quickStart } from "./CreateCharacter";
import { GameScreen } from "./GameScreen";
import { Menu } from "./Menu";
import { useAccount } from "./useAccount";
import { useGame } from "./useGame";

export function Game() {
  const { account, submit, logout } = useAccount();
  const game = useGame(account.status === "user" ? account.user : null);
  // Первый вход без сохранения: сразу в игру, без меню и анкеты (персонажа можно настроить потом в ⚙).
  const autoCreated = useRef(false);
  // Только если сервер именно этого аккаунта точно ответил «сохранения нет»: ошибка сети или
  // гонка при смене аккаунта не должны превращаться в новую игру поверх настоящего прогресса.
  const fresh =
    account.status === "user" &&
    game.synced &&
    game.serverEmptyFor === account.user.id &&
    !game.hasSave &&
    !game.state &&
    game.screen === "menu";
  useEffect(() => {
    if (fresh && !autoCreated.current) {
      autoCreated.current = true;
      quickStart(game);
    }
  }, [fresh, game]);
  // Обновили страницу с готовым сохранением: сразу в игру, меню остаётся по «⚙ → В меню».
  // Только читает сохранение (как кнопка «Продолжить») и срабатывает один раз за загрузку страницы.
  const autoContinued = useRef(false);
  const resume = account.status === "user" && game.synced && game.hasSave && !game.state && game.screen === "menu";
  useEffect(() => {
    if (resume && !autoContinued.current) {
      autoContinued.current = true;
      game.continueGame();
    }
  }, [resume, game]);
  if (account.status === "loading" || (account.status === "user" && !game.synced)) {
    return <main className="grid min-h-dvh place-items-center text-muted">…</main>;
  }
  if (account.status === "guest") return <Menu game={game} auth={submit} />;
  if (game.screen === "create") return <CreateCharacter game={game} />;
  if (game.screen === "game" && game.state) return <GameScreen game={game} state={game.state} />;
  return <Menu game={game} logout={() => { game.flush(); game.reset(true); void logout(); }} />;
}
