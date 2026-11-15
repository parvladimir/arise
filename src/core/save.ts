// Сохранение: версия схемы + миграции. Хранилище подключается адаптером,
// чтобы позже заменить браузер на Supabase без правок ядра.

import { SCHEMA_VERSION } from "./engine";
import type { GameState } from "./types";

export interface SaveStorage {
  read(): string | null;
  write(data: string): void;
  clear(): void;
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] переводит сохранение из версии n в n+1. */
const migrations: Record<number, Migration> = {};

export function serialize(state: GameState): string {
  const { toasts: _toasts, ...rest } = state;
  return JSON.stringify({ ...rest, toasts: [] });
}

export function deserialize(data: string): GameState | null {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || typeof raw.schemaVersion !== "number") return null;
  let version = raw.schemaVersion;
  if (version > SCHEMA_VERSION) return null;
  while (version < SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) return null;
    raw = migrate(raw);
    version += 1;
    raw.schemaVersion = version;
  }
  if (!isGameState(raw)) return null;
  return raw;
}

function isGameState(v: Record<string, unknown>): v is GameState & Record<string, unknown> {
  return (
    typeof v.money === "number" &&
    typeof v.xp === "number" &&
    typeof v.profile === "object" &&
    Array.isArray(v.messages) &&
    Array.isArray(v.ledger) &&
    typeof v.quests === "object"
  );
}

export function browserStorage(key = "ai-rise.save"): SaveStorage {
  return {
    read() {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(data) {
      try {
        window.localStorage.setItem(key, data);
      } catch {
        // приватный режим или переполнение — игра продолжается без сохранения
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export function memoryStorage(): SaveStorage {
  let data: string | null = null;
  return {
    read: () => data,
    write: (d) => {
      data = d;
    },
    clear: () => {
      data = null;
    },
  };
}
