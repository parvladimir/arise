import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { ruMatch } from "@/content/locales/ru.match";
import { analyzeFreeform } from "./freeform";
import { runPrompt } from "./promptSim";
import type { PromptStage, QuestDef, SlotId } from "./types";

const t = makeTranslator("ru", "they");
const ALL: SlotId[] = ["role", "goal", "recipient", "audience", "tone", "data", "limits", "format", "examples"];
const slotOf = (id: string) => content.cards.find((c) => c.id === id)?.slot;
const stage = (q: string, i = 0) => (content.quests.find((x) => x.id === q) as Extract<QuestDef, { kind: "prompt" }>).stages[i]!;
const read = (text: string, st: PromptStage, unlocked = ALL) => analyzeFreeform(text, st, slotOf, ruMatch, unlocked);
const run = (text: string, q: string, i = 0, prev = {}) => runPrompt(stage(q, i), read(text, stage(q, i)), t, prev);

describe("промпт своими словами", () => {
  it("у каждой карточки есть признаки для разбора", () => {
    const used = new Set(content.quests.flatMap((q) => (q.kind === "prompt" ? q.stages.flatMap((s) => s.cards) : [])));
    expect([...used].filter((id) => !ruMatch[id])).toEqual([]);
  });

  it("Q2: «напиши про кран» — только тема, без просьбы и адресата", () => {
    expect(read("Напиши про кран", stage("q2"))).toEqual({ goal: "g.tap.about" });
  });

  it("Q2: конкретная просьба хозяину тёплым тоном проходит обе стадии", () => {
    const text = "Напиши письмо арендодателю Виктору Петровичу: кран течёт неделю, попроси починить до пятницы. Тон тёплый и дружелюбный.";
    expect(run(text, "q2").passed).toBe(true);
    expect(run(text, "q2", 1).passed).toBe(true);
  });

  it("отрицание не включает карточку: «не резко» — это не возмущённый тон", () => {
    expect(read("Ответь на отзыв вежливо, не резко", stage("q6")).tone).toBe("t.warm");
  });

  it("Q3: без данных Нейра выдумывает, с ценами и запретом выдумывать — проходит", () => {
    expect(run("Объявление о новом меню для студентов, игриво", "q3").passed).toBe(false);
    const good = "Пригласи студентов попробовать новое меню кафе. Тон тёплый, игривый. Данные: латте 190, пирог, цены, скидка 10% до 12:00. До 300 знаков, ничего не выдумывай.";
    expect(run(good, "q3").passed).toBe(true);
  });

  it("Q5: SMS до 160 знаков с телефоном и сроком акции проходит", () => {
    const text = "Напиши одну SMS до 160 знаков про замену резины на зимнюю. Телефон 555-12-34, акция до 30 ноября.";
    expect(run(text, "q5").passed).toBe(true);
  });

  it("Q6: защищаться — не проходит, извиниться и угостить кофе — проходит", () => {
    expect(run("Ответь на отзыв и объясни гостю, что он неправ", "q6").passed).toBe(false);
    expect(run("Вежливо ответь на отзыв, извинись. Угостим гостя кофе за наш счёт. Больше ничего не обещай.", "q6").passed).toBe(true);
  });

  it("Q8: таблица из переписки с учётом переносов проходит", () => {
    expect(run("Сделай из переписки в чате расписание на неделю таблицей: день, время, занятие, тренер. Учти переносы и отмены.", "q8").passed).toBe(true);
  });

  it("Q9: внук без терминов — проходит, профессор — нет", () => {
    expect(run("Ты — терпеливый внук. Объясни бабушке, что такое облако, на примере из жизни, без терминов.", "q9").passed).toBe(true);
    expect(run("Ты — профессор. Объясни, что такое облако.", "q9").passed).toBe(false);
  });

  it("Q13: SMS с прошлогодними ценами после поста с актуальными не проходит", () => {
    const post = read("Пост для соцсетей кафе: латте 190 ₵, пирог 150 ₵, −15% до 12:00, до 30 ноября. Тепло.", stage("q13"));
    expect(post).toMatchObject({ format: "f.post", data: "d.camp.oct" });
    const sms = read("SMS до 160 знаков: латте 160 ₵, пирог 120 ₵", stage("q13", 1));
    expect(sms).toMatchObject({ format: "f.sms", data: "d.camp.old" });
    expect(runPrompt(stage("q13", 1), sms, t, { 0: post }).passed).toBe(false);
  });

  it("закрытые слоты не распознаются: без шпаргалки пример не учитывается", () => {
    const unlocked: SlotId[] = ["goal", "data", "format", "tone"];
    expect(read("SMS про резину, например: «Колесо»: пора на зимнюю резину!", stage("q5"), unlocked).examples).toBeUndefined();
  });
});
