import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { hasKey, makeTranslator } from "@/content/i18n";
import { apply, currentGoal, newGameState, type Ctx } from "./engine";
import { runPrompt } from "./promptSim";
import { deserialize, serialize } from "./save";
import type { Action, GameState, PromptStage, QuestDef } from "./types";

const ctx: Ctx = { content, t: makeTranslator("ru", "they") };
const profile = { name: "Саша", avatar: "a1" as const, pronoun: "they" as const };

function play(actions: Action[], start?: GameState) {
  let state = start ?? newGameState(profile, ctx);
  const events = [];
  for (const a of actions) {
    const r = apply(state, a, ctx);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const stageOf = (id: string, i = 0): PromptStage => {
  const q = content.quests.find((x) => x.id === id) as Extract<QuestDef, { kind: "prompt" }>;
  return q.stages[i]!;
};

const goodQ2: Action[] = [
  { type: "choose", questId: "q1", choiceId: "heard" },
  { type: "submitPrompt", questId: "q2", selection: { goal: "g.tap.fix", recipient: "r.landlord" } },
  { type: "submitPrompt", questId: "q2", selection: { goal: "g.tap.fix", recipient: "r.landlord", tone: "t.warm" } },
];

const perfectQ3: Action = {
  type: "submitPrompt",
  questId: "q3",
  selection: { goal: "g.cafe.menu", audience: "a.students", tone: "t.playful", data: "d.menu3", limits: "l.300" },
};

describe("начало игры", () => {
  it("первое сообщение — от Димы с тремя вариантами ответа", () => {
    const s = newGameState(profile, ctx);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]!.npc).toBe("dima");
    expect(s.messages[0]!.choices?.options).toHaveLength(3);
    expect(currentGoal(s, content).textKey).toBe("q1.goal");
  });

  it("любой ответ Диме открывает Нейру и задание Q2", () => {
    for (const choiceId of ["what", "heard", "show"]) {
      const { state } = play([{ type: "choose", questId: "q1", choiceId }]);
      expect(state.apps).toContain("neira");
      expect(state.quests.q2?.status).toBe("active");
      expect(state.quests.q1?.choice).toBe(choiceId);
    }
  });
});

describe("Q2 — первый промпт", () => {
  it("одна цель без адресата даёт энциклопедию про краны и не проходит", () => {
    const { state, events } = play([goodQ2[0]!, { type: "submitPrompt", questId: "q2", selection: { goal: "g.tap.about" } }]);
    const r = events.find((e) => e.type === "promptResult");
    expect(r?.type === "promptResult" && r.result.segments.map((s) => s.textKey)).toContain("q2.seg.bodyEncyclopedia");
    expect(r?.type === "promptResult" && r.result.passed).toBe(false);
    expect(state.quests.q2?.stage).toBe(0);
  });

  it("две стадии: сначала суть, потом тон; награда — навык и достижение", () => {
    const { state } = play(goodQ2);
    expect(state.quests.q2?.status).toBe("done");
    expect(state.achievements).toContain("firstPrompt");
    expect(state.skills.aiComm).toBe(1);
    expect(state.xp).toBe(5 + 15);
    expect(state.quests.q3?.status).toBe("available");
  });

  it("на второй стадии без тёплого тона задание не засчитывается", () => {
    const { state } = play([
      ...goodQ2.slice(0, 2),
      { type: "submitPrompt", questId: "q2", selection: { goal: "g.tap.fix", recipient: "r.landlord", tone: "t.angry" } },
    ]);
    expect(state.quests.q2?.status).toBe("active");
  });

  it("карточку тона нельзя подсунуть на первой стадии", () => {
    const { events } = play([goodQ2[0]!, { type: "submitPrompt", questId: "q2", selection: { goal: "g.tap.fix", tone: "t.warm" } }]);
    expect(events.at(-1)).toEqual({ type: "rejected", reasonKey: "err.badCard" });
  });
});

describe("Q3 — первый заказ", () => {
  const before = () => play([...goodQ2, { type: "acceptQuest", questId: "q3" }]).state;

  it("идеальное объявление: 100%, 150 ₵ (120 + чаевые), магазин открыт", () => {
    const { state, events } = play([perfectQ3], before());
    const r = events.find((e) => e.type === "promptResult");
    expect(r?.type === "promptResult" && r.result.quality).toBe(1);
    expect(r?.type === "promptResult" && r.pay).toBe(150);
    expect(state.money).toBe(40 + 150);
    expect(state.apps).toEqual(expect.arrayContaining(["shop", "orders", "skills"]));
    expect(state.quests.q4?.status).toBe("active");
  });

  it("без данных Нейра выдумывает тыквенный латте — Анна не принимает", () => {
    const { state, events } = play(
      [{ type: "submitPrompt", questId: "q3", selection: { goal: "g.cafe.menu", audience: "a.students", tone: "t.playful" } }],
      before(),
    );
    const r = events.find((e) => e.type === "promptResult");
    expect(r?.type === "promptResult" && r.result.segments.some((s) => s.hallucination)).toBe(true);
    expect(r?.type === "promptResult" && r.result.passed).toBe(false);
    expect(state.money).toBe(40);
  });

  it("всё меню целиком не влезает в 300 знаков", () => {
    const r = runPrompt(stageOf("q3"), { ...(perfectQ3 as Extract<Action, { type: "submitPrompt" }>).selection, data: "d.menuFull" }, ctx.t);
    expect(r.length).toBeGreaterThan(300);
    expect(r.criteria.find((c) => c.id === "length")?.passed).toBe(false);
  });

  it("средний результат (70–89%) — 120 ₵ без чаевых", () => {
    const { events } = play(
      [{ type: "submitPrompt", questId: "q3", selection: { goal: "g.cafe.menu", audience: "a.all", tone: "t.formal", data: "d.menu3", limits: "l.300" } }],
      before(),
    );
    const r = events.find((e) => e.type === "promptResult");
    expect(r?.type === "promptResult" && r.result.quality).toBe(0.85);
    expect(r?.type === "promptResult" && r.pay).toBe(120);
  });

  it("после двух неудач оплата снижается на 15%", () => {
    const bad: Action = { type: "submitPrompt", questId: "q3", selection: { goal: "g.cafe.history" } };
    const { events } = play([bad, bad, { ...perfectQ3 }], before());
    const last = events.filter((e) => e.type === "promptResult").at(-1);
    expect(last?.type === "promptResult" && last.pay).toBe(130);
  });
});

describe("экономика и защита от повторов", () => {
  const afterQ3 = () => play([...goodQ2, { type: "acceptQuest", questId: "q3" }, perfectQ3]).state;

  it("повторная отправка сданного заказа не платит второй раз", () => {
    const s = afterQ3();
    const { state, events } = play([perfectQ3], s);
    expect(events[0]).toEqual({ type: "rejected", reasonKey: "err.questUnavailable" });
    expect(state.money).toBe(s.money);
    expect(state.ledger.filter((e) => e.key === "quest:q3")).toHaveLength(1);
  });

  it("покупка: списывает деньги, открывает слот, закрывает Q4 и выводит заказ Сергея", () => {
    const { state } = play([{ type: "buy", itemId: "cheatsheet" }], afterQ3());
    expect(state.money).toBe(190 - 80);
    expect(state.slots).toContain("examples");
    expect(state.quests.q4?.status).toBe("done");
    expect(state.quests.q5?.status).toBe("available");
  });

  it("нельзя купить дважды и нельзя уйти в минус", () => {
    const s = play([{ type: "buy", itemId: "lamp" }, { type: "buy", itemId: "lamp" }], afterQ3());
    expect(s.events.at(-1)).toEqual({ type: "rejected", reasonKey: "err.owned" });
    const poor = play([{ type: "buy", itemId: "coffee" }], newGameState(profile, ctx));
    expect(poor.events[0]).toEqual({ type: "rejected", reasonKey: "err.noMoney" });
  });
});

describe("Q5 — 160 знаков", () => {
  const ready = (item: string) =>
    play([...goodQ2, { type: "acceptQuest", questId: "q3" }, perfectQ3, { type: "buy", itemId: item }, { type: "acceptQuest", questId: "q5" }]).state;

  it("письмо вместо SMS — жёсткий провал по длине", () => {
    const { events } = play([{ type: "submitPrompt", questId: "q5", selection: { goal: "g.sms.tires", data: "d.sms.facts", format: "f.letter" } }], ready("lamp"));
    const r = events.find((e) => e.type === "promptResult");
    expect(r?.type === "promptResult" && r.result.passed).toBe(false);
  });

  it("без шпаргалки максимум 85%, со шпаргалкой — 100% и чаевые", () => {
    const sel = { goal: "g.sms.tires", data: "d.sms.facts", format: "f.sms" };
    const noSheet = play([{ type: "submitPrompt", questId: "q5", selection: sel }], ready("lamp"));
    const r1 = noSheet.events.find((e) => e.type === "promptResult");
    expect(r1?.type === "promptResult" && r1.result.quality).toBe(0.85);

    const withSheet = play([{ type: "submitPrompt", questId: "q5", selection: { ...sel, examples: "e.sms" } }], ready("cheatsheet"));
    const r2 = withSheet.events.find((e) => e.type === "promptResult");
    expect(r2?.type === "promptResult" && r2.result.quality).toBe(1);
    expect(withSheet.state.achievements).toContain("regular");
  });

  it("слот «Примеры» недоступен без шпаргалки", () => {
    const { events } = play(
      [{ type: "submitPrompt", questId: "q5", selection: { goal: "g.sms.tires", format: "f.sms", examples: "e.sms" } }],
      ready("lamp"),
    );
    expect(events[0]).toEqual({ type: "rejected", reasonKey: "err.badCard" });
  });
});

describe("сохранение", () => {
  it("сохранение и загрузка дают то же состояние", () => {
    const { state } = play(goodQ2);
    const loaded = deserialize(serialize(state));
    expect(loaded).toEqual({ ...state, toasts: [] });
  });

  it("битые и будущие сохранения отклоняются", () => {
    expect(deserialize("{oops")).toBeNull();
    expect(deserialize(JSON.stringify({ schemaVersion: 999 }))).toBeNull();
    expect(deserialize(JSON.stringify({ schemaVersion: 1, money: "много" }))).toBeNull();
  });
});

describe("контент", () => {
  it("каждый ключ текста есть в русском словаре", () => {
    const keys = new Set<string>([content.finalGoalKey]);
    for (const c of content.cards) keys.add(c.textKey);
    for (const i of content.items) keys.add(i.nameKey).add(i.descKey);
    for (const s of content.skills) keys.add(s.nameKey);
    for (const q of content.quests) {
      keys.add(q.titleKey).add(q.goalKey);
      if (q.offer.type !== "auto") keys.add(q.offer.textKey);
      if (q.reward.milestoneKey) keys.add(q.reward.milestoneKey);
      for (const a of q.reward.achievements ?? []) keys.add(`ach.${a}`);
      for (const m of q.onComplete ?? []) keys.add(m.textKey);
      if (q.kind === "dialog") {
        keys.add(q.promptKey);
        for (const c of q.choices) keys.add(c.textKey).add(c.replyKey);
      }
      if (q.kind === "prompt") {
        for (const st of q.stages) {
          keys.add(st.taskKey);
          if (st.afterPass) keys.add(st.afterPass.textKey);
          for (const c of st.criteria) keys.add(c.labelKey);
          for (const seg of st.segments) for (const v of seg.variants) if (v.textKey) keys.add(v.textKey);
        }
      }
    }
    const missing = [...keys].filter((k) => !hasKey(k));
    expect(missing).toEqual([]);
  });

  it("на каждой стадии есть хотя бы один набор карточек, который проходит на 100%", () => {
    for (const q of content.quests) {
      if (q.kind !== "prompt") continue;
      for (const st of q.stages) {
        const bySlot = st.slots.map((slot) => ["none", ...st.cards.filter((id) => content.cards.find((c) => c.id === id)?.slot === slot)]);
        let best = 0;
        const walk = (i: number, sel: Record<string, string>) => {
          if (i === st.slots.length) {
            best = Math.max(best, runPrompt(st, sel, ctx.t, { 0: { tone: "x" } }).quality);
            return;
          }
          for (const id of bySlot[i]!) walk(i + 1, id === "none" ? sel : { ...sel, [st.slots[i]!]: id });
        };
        walk(0, {});
        expect(best, `${q.id}: ${st.taskKey}`).toBe(1);
      }
    }
  });
});
