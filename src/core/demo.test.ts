import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { apply, START_MONEY } from "./engine";
import { DEMO_BONUS, DEMO_ROWS, demoBonusFrom, demoComplete, demoResult, type DemoPicks } from "./demo";

const best: DemoPicks = Object.fromEntries(DEMO_ROWS.map((r) => [r.slot, r.options.find((o) => o.good)?.id]));

describe("демо-заказ на промо-странице", () => {
  it("в каждой строке ровно одна сильная карточка", () => {
    for (const r of DEMO_ROWS) expect(r.options.filter((o) => o.good)).toHaveLength(1);
  });

  it("сильный промпт даёт полный ответ и все ₵", () => {
    expect(demoComplete(best)).toBe(true);
    const r = demoResult(best);
    expect(r.reward).toBe(DEMO_BONUS);
    expect(r.answer).toContain("Садовую, 5");
    expect(r.notes).toHaveLength(0);
  });

  it("без фактов ИИ пишет общие слова и объясняет почему", () => {
    const r = demoResult({ ...best, task: "t-short" });
    expect(r.reward).toBe(DEMO_BONUS - 50);
    expect(r.answer).not.toContain("20%");
    expect(r.notes[0]).toMatch(/скидку/);
  });

  it("₵ из демо приходят в новую игру, но не больше бонуса", () => {
    const ctx = { content, t: makeTranslator("ru", "they") };
    const profile = { name: "Саша", avatar: "a1" as const, pronoun: "they" as const, level: "novice" as const };
    expect(apply(null as never, { type: "newGame", profile, bonus: 150 }, ctx).state.money).toBe(START_MONEY + 150);
    expect(apply(null as never, { type: "newGame", profile, bonus: 99999 }, ctx).state.money).toBe(START_MONEY + DEMO_BONUS);
    expect(apply(null as never, { type: "newGame", profile }, ctx).state.money).toBe(START_MONEY);
    expect(demoBonusFrom("abc")).toBe(0);
  });
});
