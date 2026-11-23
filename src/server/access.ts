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
      -- Воронка для статистики станции ТАКТ: кто пришёл в бота, был ли уже подписан, когда подписался.
      CREATE TABLE IF NOT EXISTS tg_leads (
        tg_id INTEGER PRIMARY KEY,
        source TEXT,
        first_seen INTEGER NOT NULL,
        was_subscribed INTEGER NOT NULL,
        subscribed_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS funnel_daily (
        day TEXT NOT NULL,
        source TEXT NOT NULL,
        metric TEXT NOT NULL,
        n INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, source, metric)
      );
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

const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const cleanSource = (s: string | null | undefined) => (s ?? "").replace(/[^\w-]/g, "").slice(0, 32) || "direct";

/** Счётчик по дням (например, показы промо-страницы игры). */
export function bump(metric: string, source: string | null | undefined, now = Date.now()) {
  accessDb()
    .prepare("INSERT INTO funnel_daily (day, source, metric, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, source, metric) DO UPDATE SET n = n + 1")
    .run(dayOf(now), cleanSource(source), metric);
}

/** Человек написал боту: запоминаем, был ли он уже подписан, и момент подписки. */
export function trackLead(tgId: number, source: string | null, subscribed: boolean, now = Date.now()) {
  const d = accessDb();
  d.prepare("INSERT INTO tg_leads (tg_id, source, first_seen, was_subscribed, subscribed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(tg_id) DO NOTHING")
    .run(tgId, cleanSource(source), now, subscribed ? 1 : 0, subscribed ? now : null);
  if (subscribed) d.prepare("UPDATE tg_leads SET subscribed_at = ? WHERE tg_id = ? AND subscribed_at IS NULL").run(now, tgId);
}

export interface FunnelStats {
  at: number;
  totals: { views: number; leads: number; newSubs: number; wereSubs: number; links: number; opened: number; stillSubscribed: number };
  week: { views: number; leads: number; newSubs: number; opened: number };
  bySource: { source: string; views: number; leads: number; newSubs: number }[];
  days: { day: string; views: number; leads: number; newSubs: number }[];
}

/** Сводка для вкладки «Статистика» на станции ТАКТ. */
export function funnelStats(now = Date.now()): FunnelStats {
  const d = accessDb();
  const one = (sql: string, ...p: (number | string)[]) => Number((d.prepare(sql).get(...p) as { n: number | null }).n ?? 0);
  const weekAgo = now - 7 * 86400_000;
  const weekDay = dayOf(weekAgo);
  const NEW = "was_subscribed = 0 AND subscribed_at IS NOT NULL";
  const sources = new Map<string, { source: string; views: number; leads: number; newSubs: number }>();
  const src = (s: string) => sources.get(s) ?? (sources.set(s, { source: s, views: 0, leads: 0, newSubs: 0 }), sources.get(s)!);
  for (const r of d.prepare("SELECT source, SUM(n) AS n FROM funnel_daily WHERE metric = 'view' GROUP BY source").all() as { source: string; n: number }[]) src(r.source).views = r.n;
  for (const r of d.prepare(`SELECT source, COUNT(*) AS n, SUM(${NEW}) AS s FROM tg_leads GROUP BY source`).all() as { source: string; n: number; s: number }[]) {
    src(r.source).leads = r.n;
    src(r.source).newSubs = r.s ?? 0;
  }
  const days: FunnelStats["days"] = [];
  for (let i = 13; i >= 0; i--) {
    const day = dayOf(now - i * 86400_000);
    days.push({
      day,
      views: one("SELECT SUM(n) AS n FROM funnel_daily WHERE metric = 'view' AND day = ?", day),
      leads: one("SELECT COUNT(*) AS n FROM tg_leads WHERE date(first_seen / 1000, 'unixepoch') = ?", day),
      newSubs: one(`SELECT COUNT(*) AS n FROM tg_leads WHERE ${NEW} AND date(subscribed_at / 1000, 'unixepoch') = ?`, day),
    });
  }
  return {
    at: now,
    totals: {
      views: one("SELECT SUM(n) AS n FROM funnel_daily WHERE metric = 'view'"),
      leads: one("SELECT COUNT(*) AS n FROM tg_leads"),
      newSubs: one(`SELECT COUNT(*) AS n FROM tg_leads WHERE ${NEW}`),
      wereSubs: one("SELECT COUNT(*) AS n FROM tg_leads WHERE was_subscribed = 1"),
      links: one("SELECT COUNT(*) AS n FROM tg_players"),
      opened: one("SELECT COUNT(*) AS n FROM tg_players WHERE opened_at > 0"),
      stillSubscribed: one("SELECT COUNT(*) AS n FROM tg_players WHERE subscribed = 1"),
    },
    week: {
      views: one("SELECT SUM(n) AS n FROM funnel_daily WHERE metric = 'view' AND day >= ?", weekDay),
      leads: one("SELECT COUNT(*) AS n FROM tg_leads WHERE first_seen >= ?", weekAgo),
      newSubs: one(`SELECT COUNT(*) AS n FROM tg_leads WHERE ${NEW} AND subscribed_at >= ?`, weekAgo),
      opened: one("SELECT COUNT(*) AS n FROM tg_players WHERE opened_at >= ?", weekAgo),
    },
    bySource: [...sources.values()].sort((a, b) => b.views + b.leads - (a.views + a.leads)),
    days,
  };
}

/** Сколько человек уже открыли игру по ссылке из бота (для счётчика на промо-странице). */
export function playersCount(): number {
  const row = accessDb().prepare("SELECT COUNT(*) AS n FROM tg_players WHERE opened_at > 0").get() as { n: number };
  return Number(row.n);
}
