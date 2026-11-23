// База игроков: SQLite-файл на сервере игры (встроенный node:sqlite, без внешних сервисов).
// Файл лежит в DATA_DIR (на сервере — docker-том), поэтому переживает пересборку образа.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | null = null;

export function openDb(file?: string): DatabaseSync {
  const path = file ?? join(process.env.DATA_DIR ?? join(process.cwd(), "data"), "arise.db");
  if (path !== ":memory:") mkdirSync(join(path, ".."), { recursive: true });
  const d = new DatabaseSync(path);
  d.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      pass TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS saves (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  // Вход через Telegram: аккаунт привязан к tg_id, имя берём из Telegram.
  const cols = (d.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("tg_id")) d.exec("ALTER TABLE users ADD COLUMN tg_id INTEGER");
  if (!cols.includes("name")) d.exec("ALTER TABLE users ADD COLUMN name TEXT");
  d.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_tg ON users(tg_id)");
  return d;
}

/** Одна база на процесс сервера. */
export function getDb(): DatabaseSync {
  db ??= openDb();
  return db;
}

/** Для тестов: подменить базу (например, на :memory:). */
export function setDb(d: DatabaseSync | null) {
  db = d;
}
