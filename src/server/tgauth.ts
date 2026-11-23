// Вход через Telegram: личный ключ из бота сам открывает аккаунт игры, без почты и пароля.
// Аккаунт привязан к tg_id; если игрок раньше заводил аккаунт по почте, Telegram привязывается к нему.

import type { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, playerByKey, type Player } from "./access";
import { createSession, linkTelegram, userForTelegram, type User } from "./auth";
import { currentUser, setSessionCookie } from "./http";

/** После «Выйти» не входим снова автоматически, пока игрок сам не войдёт. */
export const NO_AUTO_COOKIE = "arise_noauto";

export const accessPlayer = (req: NextRequest): Player | null => playerByKey(req.cookies.get(ACCESS_COOKIE)?.value);

/**
 * Кто играет: аккаунт из сессии (к нему привязываем Telegram, если ключ есть в браузере)
 * или, если сессии нет, аккаунт по ключу из бота — тогда сразу открываем новую сессию.
 */
export function resolveUser(req: NextRequest, res: NextResponse, player: Player | null = accessPlayer(req)): User | null {
  const user = currentUser(req);
  if (user) {
    if (player) linkTelegram(user.id, player.tg_id, player.name);
    return user;
  }
  if (!player || req.cookies.get(NO_AUTO_COOKIE)) return null;
  const tgUser = userForTelegram(player.tg_id, player.name);
  setSessionCookie(res, req, createSession(tgUser.id).token);
  return tgUser;
}
