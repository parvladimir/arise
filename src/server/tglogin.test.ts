import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb, setDb, getDb } from "./db";
import { addEmail, linkTelegram, login, register, storeSave, userForTelegram } from "./auth";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { newGameState } from "@/core/engine";
import { serialize } from "@/core/save";

const save = () =>
  serialize(newGameState({ name: "Вова", avatar: "a1", pronoun: "he", level: "novice" }, { content, t: makeTranslator("ru", "he") }));

describe("вход через Telegram", () => {
  beforeEach(() => setDb(openDb(":memory:")));
  afterEach(() => setDb(null));

  it("ключ из бота открывает один и тот же аккаунт без почты", () => {
    const a = userForTelegram(7, "Вова П");
    const b = userForTelegram(7, "Вова П");
    expect(a.id).toBe(b.id);
    expect(a.email).toBe("");
    expect(a.name).toBe("Вова П");
    // по служебной «почте» нельзя войти паролем
    expect(login("tg7@telegram", "")).toBe("wrongLogin");
  });

  it("вход по почте забирает Telegram себе, пустой аккаунт из Telegram удаляется", () => {
    const tg = userForTelegram(8, "Оля");
    const mail = register("olya@x.de", "password123");
    if (typeof mail === "string") throw new Error(mail);
    linkTelegram(mail.id, 8, "Оля");
    expect(userForTelegram(8, "Оля").id).toBe(mail.id);
    expect(getDb().prepare("SELECT 1 FROM users WHERE id = ?").get(tg.id)).toBeUndefined();
  });

  it("аккаунт из Telegram с прогрессом не удаляется при входе в другой по почте", () => {
    const tg = userForTelegram(9, "Ян");
    expect(storeSave(tg.id, save())).toBe(true);
    const mail = register("yan@x.de", "password123");
    if (typeof mail === "string") throw new Error(mail);
    linkTelegram(mail.id, 9, "Ян");
    expect(getDb().prepare("SELECT 1 FROM users WHERE id = ?").get(tg.id)).toBeTruthy();
    expect(userForTelegram(9, "Ян").id).toBe(mail.id);
  });

  it("игрок из Telegram может добавить почту и войти с ней в тот же аккаунт", () => {
    const tg = userForTelegram(10, "Макс");
    const u = addEmail(tg.id, "max@x.de", "password123");
    if (typeof u === "string") throw new Error(u);
    expect(u.id).toBe(tg.id);
    const l = login("max@x.de", "password123");
    expect(typeof l === "string" ? l : l.id).toBe(tg.id);
    expect(addEmail(tg.id, "max@x.de", "password123")).toBe("taken");
  });

  it("старая база без колонок tg_id и name обновляется при открытии", () => {
    const file = join(mkdtempSync(join(tmpdir(), "arise-")), "old.db");
    const old = new DatabaseSync(file);
    old.exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, pass TEXT NOT NULL, created_at INTEGER NOT NULL)");
    old.close();
    setDb(openDb(file));
    expect(userForTelegram(11, null).email).toBe("");
  });
});
