import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, setDb } from "./db";
import { ACCESS_COOKIE, gateEnabled, hasAccess, issueKey, markOpened, playerByKey } from "./access";

describe("доступ по подписке", () => {
  beforeEach(() => {
    setDb(openDb(":memory:"));
    process.env.GAME_BOT_USERNAME = "takt_game_bot";
  });
  afterEach(() => {
    setDb(null);
    delete process.env.GAME_BOT_USERNAME;
    delete process.env.ACCESS_GATE;
  });

  it("без имени бота ворота выключены, игра открыта", () => {
    delete process.env.GAME_BOT_USERNAME;
    expect(gateEnabled()).toBe(false);
    expect(hasAccess(() => undefined)).toBe(true);
  });

  it("ACCESS_GATE=off выключает ворота", () => {
    process.env.ACCESS_GATE = "off";
    expect(hasAccess(() => undefined)).toBe(true);
  });

  it("без ключа не пускает, с ключом пускает", () => {
    expect(hasAccess(() => undefined)).toBe(false);
    const key = issueKey({ id: 42, username: "vova", first_name: "Вова" }, "reels");
    expect(hasAccess((n) => (n === ACCESS_COOKIE ? key : undefined))).toBe(true);
    expect(hasAccess((n) => (n === ACCESS_COOKIE ? key + "x" : undefined))).toBe(false);
  });

  it("повторный запрос даёт тот же ключ и обновляет имя", () => {
    const a = issueKey({ id: 7, first_name: "А" }, "site");
    const b = issueKey({ id: 7, first_name: "Б" }, null);
    expect(b).toBe(a);
    const p = playerByKey(a)!;
    expect(p.name).toBe("Б");
    expect(p.source).toBe("site");
  });

  it("первое открытие игры запоминается", () => {
    const key = issueKey({ id: 9 }, null);
    markOpened(9, 1000);
    markOpened(9, 2000);
    expect(playerByKey(key)!.opened_at).toBe(1000);
  });
});
