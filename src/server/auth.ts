// Аккаунты игроков: почта + пароль, сессия в httpOnly-куке.
// Пароли хранятся только как scrypt-хеш с солью, токен сессии — только как sha256.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deserialize } from "@/core/save";
import { getDb } from "./db";

export const SESSION_COOKIE = "arise_session";
export const SESSION_DAYS = 30;
export const MIN_PASSWORD = 8;
export const MAX_SAVE_BYTES = 512 * 1024;

export type AuthError = "badEmail" | "shortPassword" | "taken" | "wrongLogin" | "tooMany";

export interface User {
  id: number;
  /** Пустая строка у аккаунта, заведённого через Telegram без почты. */
  email: string;
  /** Имя из Telegram, если аккаунт привязан к Telegram. */
  name?: string | null;
}

/** Служебная «почта» аккаунта из Telegram: по ней нельзя войти паролем (не проходит проверку адреса). */
export const tgMail = (tgId: number) => `tg${tgId}@telegram`;
const isTgMail = (email: string) => /^tg\d+@telegram$/.test(email);
export const publicUser = (row: { id: number; email: string; name?: string | null }): User => ({
  id: row.id,
  email: isTgMail(row.email) ? "" : row.email,
  name: row.name ?? null,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// Защита от перебора: не больше 10 попыток входа на почту или адрес за 15 минут.
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(key: string, now = Date.now()): boolean {
  const list = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  attempts.set(key, list);
  if (attempts.size > 10000) for (const [k, v] of attempts) if (v.every((t) => now - t >= WINDOW_MS)) attempts.delete(k);
  return list.length > MAX_ATTEMPTS;
}

export function resetAttempts() {
  attempts.clear();
}

export function register(emailRaw: unknown, password: unknown): User | AuthError {
  const email = normalizeEmail(emailRaw);
  if (!email) return "badEmail";
  if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > 200) return "shortPassword";
  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return "taken";
  const r = db.prepare("INSERT INTO users (email, pass, created_at) VALUES (?, ?, ?)").run(email, hashPassword(password), Date.now());
  return { id: Number(r.lastInsertRowid), email };
}

export function login(emailRaw: unknown, password: unknown): User | AuthError {
  const email = normalizeEmail(emailRaw);
  if (!email || typeof password !== "string") return "wrongLogin";
  const row = getDb().prepare("SELECT id, email, pass, name FROM users WHERE email = ?").get(email) as
    | { id: number; email: string; pass: string; name: string | null }
    | undefined;
  if (!row || !verifyPassword(password, row.pass)) return "wrongLogin";
  return publicUser(row);
}

/** Новая сессия: токен уходит в куку, в базе остаётся только его хеш. */
export function createSession(userId: number): { token: string; expires: Date } {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(sha(token), userId, expires.getTime());
  return { token, expires };
}

export function userFromToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = getDb()
    .prepare("SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?")
    .get(sha(token), Date.now()) as { id: number; email: string; name: string | null } | undefined;
  return row ? publicUser(row) : null;
}

export function deleteSession(token: string | undefined) {
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(sha(token));
}

export function loadSave(userId: number): { data: string; updatedAt: number } | null {
  const row = getDb().prepare("SELECT data, updated_at FROM saves WHERE user_id = ?").get(userId) as { data: string; updated_at: number } | undefined;
  return row ? { data: row.data, updatedAt: row.updated_at } : null;
}

/** Сохраняет прогресс, только если это корректное сохранение игры разумного размера. */
export function storeSave(userId: number, data: unknown): boolean {
  if (typeof data !== "string" || Buffer.byteLength(data) > MAX_SAVE_BYTES || !deserialize(data)) return false;
  getDb()
    .prepare("INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at")
    .run(userId, data, Date.now());
  return true;
}

/** Аккаунт игрока из Telegram: находит привязанный к tg_id или заводит новый без почты и пароля. */
export function userForTelegram(tgId: number, name: string | null): User {
  const db = getDb();
  const row = db.prepare("SELECT id, email, name FROM users WHERE tg_id = ?").get(tgId) as { id: number; email: string; name: string | null } | undefined;
  if (row) {
    if (name && name !== row.name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, row.id);
    return publicUser({ ...row, name: name ?? row.name });
  }
  const r = db.prepare("INSERT INTO users (email, pass, created_at, tg_id, name) VALUES (?, '', ?, ?, ?)").run(tgMail(tgId), Date.now(), tgId, name);
  return publicUser({ id: Number(r.lastInsertRowid), email: tgMail(tgId), name });
}

/**
 * Игрок вошёл по почте, а в браузере есть и ключ из Telegram: привязываем Telegram к этому аккаунту,
 * чтобы дальше ссылка из бота открывала тот же прогресс. Пустой аккаунт из Telegram удаляем.
 */
export function linkTelegram(userId: number, tgId: number, name: string | null) {
  const db = getDb();
  const me = db.prepare("SELECT tg_id FROM users WHERE id = ?").get(userId) as { tg_id: number | null } | undefined;
  if (!me || me.tg_id !== null) return;
  const other = db.prepare("SELECT id, email FROM users WHERE tg_id = ?").get(tgId) as { id: number; email: string } | undefined;
  if (other) {
    const hasSave = db.prepare("SELECT 1 FROM saves WHERE user_id = ?").get(other.id);
    if (isTgMail(other.email) && !hasSave) db.prepare("DELETE FROM users WHERE id = ?").run(other.id);
    else db.prepare("UPDATE users SET tg_id = NULL WHERE id = ?").run(other.id);
  }
  db.prepare("UPDATE users SET tg_id = ?, name = COALESCE(name, ?) WHERE id = ?").run(tgId, name, userId);
}

/** Аккаунт из Telegram получает почту и пароль, чтобы входить и без бота. Прогресс остаётся тем же. */
export function addEmail(userId: number, emailRaw: unknown, password: unknown): User | AuthError {
  const email = normalizeEmail(emailRaw);
  if (!email) return "badEmail";
  if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > 200) return "shortPassword";
  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return "taken";
  db.prepare("UPDATE users SET email = ?, pass = ? WHERE id = ?").run(email, hashPassword(password), userId);
  const row = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(userId) as { id: number; email: string; name: string | null };
  return publicUser(row);
}
