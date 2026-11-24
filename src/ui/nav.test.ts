import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { newGameState } from "@/core/engine";
import { goalTarget, nothingToDoToday, todayKey } from "./nav";

describe("подсказка «Новый заказ» после сюжета", () => {
  it("ведёт к заказам, а когда все заказы дня сданы, не зовёт к ноутбуку", () => {
    const s = newGameState({ name: "Вова", avatar: "a1", pronoun: "he", level: "practice" }, { content, t: makeTranslator("ru", "he") });
    // сюжет пройден: все задания отмечены сделанными
    for (const q of content.quests) s.quests[q.id] = { status: "done", stage: 0, attempts: 1, bestQuality: 1, selections: {} };
    expect(goalTarget(s)).toEqual({ view: "laptop", app: "orders" });
    expect(nothingToDoToday(s)).toBe(false);
    s.daily = { day: todayKey(), done: ["a", "b", "c"] };
    // «Перейти» по-прежнему ведёт к заказам, но ноутбук больше не подсвечивается
    expect(goalTarget(s)).toEqual({ view: "laptop", app: "orders" });
    expect(nothingToDoToday(s)).toBe(true);
  });
});
