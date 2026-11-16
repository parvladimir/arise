// Сохранение: версия схемы + миграции. Хранилище подключается адаптером,
// чтобы позже заменить браузер на Supabase без правок ядра.

import { DAY_START_HOUR, SCHEMA_VERSION } from "./engine";
import type { AvatarId, GameState, Level, Pronoun, QuestProgress } from "./types";

const AVATAR_IDS: AvatarId[] = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12"];

export interface SaveStorage {
  read(): string | null;
  write(data: string): void;
  clear(): void;
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] переводит сохранение из версии n в n+1. */
const migrations: Record<number, Migration> = {
  // v2: решения игрока и отношения с персонажами
  1: (raw) => ({ ...raw, flags: [], relations: {} }),
  // v3: прочитанные уроки
  2: (raw) => ({ ...raw, lessons: [] }),
  // v4: подработка сдаётся один раз. В старых сейвах сданные подработки возвращались
  // на доску (status available, runs ≥ 1) — переводим их в выполненные.
  3: (raw) => ({ ...raw, quests: finishGigs(raw.quests) }),
  // v5: то же для сейвов v4, где сданная подработка ждала следующего дня (readyDay).
  4: (raw) => ({ ...raw, quests: finishGigs(raw.quests) }),
};

function finishGigs(raw: unknown): Record<string, QuestProgress> {
  const quests = { ...((raw ?? {}) as Record<string, QuestProgress & { readyDay?: number }>) };
  for (const [id, p] of Object.entries(quests)) {
    if (p && (p.runs ?? 0) > 0) {
      const { readyDay: _r, ...rest } = p;
      quests[id] = { ...rest, status: "done" };
    }
  }
  return quests;
}

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
  return withDefaults(raw);
}

const PRONOUNS: Pronoun[] = ["he", "she", "they"];
const LEVELS: Level[] = ["novice", "practice", "pro"];
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * Дополняет сохранение недостающими полями: обрезанный или старый сейв
 * не должен ронять игру на «Продолжить».
 */
function withDefaults(raw: GameState & Record<string, unknown>): GameState {
  const p = (raw.profile ?? {}) as Partial<GameState["profile"]>;
  const skills = (typeof raw.skills === "object" && raw.skills !== null ? raw.skills : {}) as Partial<GameState["skills"]>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    ...raw,
    profile: {
      name: typeof p.name === "string" && p.name.trim() ? p.name.slice(0, 24) : "Саша",
      avatar: typeof p.avatar === "string" && AVATAR_IDS.includes(p.avatar as AvatarId) ? (p.avatar as AvatarId) : "a1",
      pronoun: PRONOUNS.includes(p.pronoun as Pronoun) ? (p.pronoun as Pronoun) : "they",
      level: LEVELS.includes(p.level as Level) ? (p.level as Level) : "practice",
    },
    rep: num(raw.rep, 0),
    day: num(raw.day, 1),
    hour: num(raw.hour, DAY_START_HOUR),
    skills: { aiComm: num(skills.aiComm, 0), aiLiteracy: num(skills.aiLiteracy, 0) },
    inventory: isStrArray(raw.inventory) ? raw.inventory : [],
    // Школа открыта всем с начала игры, в том числе в старых сохранениях.
    apps: [...new Set<GameState["apps"][number]>(["school", ...(isStrArray(raw.apps) ? (raw.apps as GameState["apps"]) : [])])],
    slots: isStrArray(raw.slots) ? (raw.slots as GameState["slots"]) : ["goal", "recipient", "tone"],
    unread: isStrArray(raw.unread) ? (raw.unread as GameState["unread"]) : [],
    achievements: isStrArray(raw.achievements) ? raw.achievements : [],
    flags: isStrArray(raw.flags) ? raw.flags : [],
    lessons: isStrArray(raw.lessons) ? raw.lessons : [],
    relations: typeof raw.relations === "object" && raw.relations !== null ? raw.relations : {},
    toasts: [],
    nextMessageId: num(raw.nextMessageId, raw.messages.length + 1),
  };
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
