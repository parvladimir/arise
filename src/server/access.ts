// Доступ к игре через подписку на канал ТАКТ AI.
// Telegram-бот (server/bot.ts) проверяет подписку и выдаёт каждому игроку личный ключ.
// Ключ приходит ссылкой /api/access?k=…, сохраняется в куке, и игра открывается в этом браузере.
// Пока не задан GAME_BOT_USERNAME, ворота выключены и игра открыта всем (локальная разработка, первый запуск).

import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "./db";
import { SESSION_COOKIE, userFromToken } from "./auth";

export const ACCESS_COOKIE = "arise_access";
export const ACCESS_DAYS = 400;

export interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface Player {
  tg_id: number;
  username: string | null;
  name: string | null;
  access_key: string;
  source: string | null;
  subscribed: number;
  created_at: number;
  checked_at: number;
  reminded_at: number;
  opened_at: number;
}

const ready = new WeakSet<DatabaseSync>();

export function accessDb(): DatabaseSync {
  const d = getDb();
  if (!ready.has(d)) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS tg_players (
        tg_id INTEGER PRIMARY KEY,
        username TEXT,
        name TEXT,
        access_key TEXT NOT NULL UNIQUE,
        source TEXT,
        subscribed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        checked_at INTEGER NOT NULL DEFAULT 0,
        reminded_at INTEGER NOT NULL DEFAULT 0,
        opened_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS bot_state (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    `);
    ready.add(d);
  }
  return d;
}

export const gateEnabled = () => Boolean(process.env.GAME_BOT_USERNAME) && process.env.ACCESS_GATE !== "off";

export const botUrl = (start = "game") =>
  `https://t.me/${(process.env.GAME_BOT_USERNAME ?? "").replace(/^@/, "")}?start=${encodeURIComponent(start)}`;

const fullName = (u: TgUser) => [u.first_name, u.last_name].filter(Boolean).join(" ") || null;

/** Подписчик получает ключ; повторный запрос возвращает тот же ключ (ссылка не меняется). */
export function issueKey(u: TgUser, source: string | null, now = Date.now()): string {
  const d = accessDb();
  const row = d.prepare("SELECT access_key FROM tg_players WHERE tg_id = ?").get(u.id) as { access_key: string } | undefined;
  if (row) {
    d.prepare("UPDATE tg_players SET username = ?, name = ?, subscribed = 1, checked_at = ? WHERE tg_id = ?")
      .run(u.username ?? null, fullName(u), now, u.id);
    return row.access_key;
  }
  const key = randomBytes(18).toString("base64url");
  d.prepare(
    "INSERT INTO tg_players (tg_id, username, name, access_key, source, subscribed, created_at, checked_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
  ).run(u.id, u.username ?? null, fullName(u), key, source, now, now);
  return key;
}

export function playerByKey(key: string | undefined): Player | null {
  if (!key || key.length > 64) return null;
  return (accessDb().prepare("SELECT * FROM tg_players WHERE access_key = ?").get(key) as Player | undefined) ?? null;
}

export function markOpened(tgId: number, now = Date.now()) {
  accessDb().prepare("UPDATE tg_players SET opened_at = ? WHERE tg_id = ? AND opened_at = 0").run(now, tgId);
}

/** Пускать ли в игру: ворота выключены, есть личный ключ или вход в аккаунт игры. */
export function hasAccess(cookie: (name: string) => string | undefined): boolean {
  if (!gateEnabled()) return true;
  if (playerByKey(cookie(ACCESS_COOKIE))) return true;
  return userFromToken(cookie(SESSION_COOKIE)) !== null;
}
