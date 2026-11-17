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

describe("воронка для станции", () => {
  beforeEach(() => setDb(openDb(":memory:")));
  afterEach(() => setDb(null));

  it("считает показы, приходы и новых подписчиков по источникам", async () => {
    const { bump, trackLead, funnelStats } = await import("./access");
    const now = Date.UTC(2026, 10, 18, 12);
    bump("view", "ig", now); bump("view", "ig", now); bump("view", null, now);
    trackLead(1, "ig", false, now);          // пришёл без подписки
    trackLead(1, "ig", true, now + 60_000);   // подписался — это новый подписчик благодаря игре
    trackLead(2, "site", true, now);         // уже был подписан
    trackLead(3, "ig", false, now);          // так и не подписался
    const s = funnelStats(now + 3600_000);
    expect(s.totals).toMatchObject({ views: 3, leads: 3, newSubs: 1, wereSubs: 1 });
    const ig = s.bySource.find((x) => x.source === "ig")!;
    expect(ig).toMatchObject({ views: 2, leads: 2, newSubs: 1 });
    expect(s.days.at(-1)).toMatchObject({ views: 3, leads: 3, newSubs: 1 });
  });
});
