import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { hasKey, makeTranslator } from "@/content/i18n";
import { apply, currentGoal, newGameState, passFor, refreshQuests, type Ctx } from "./engine";
import { runPrompt } from "./promptSim";
import { deserialize, serialize } from "./save";
import { ru } from "@/content/locales/ru";
import type { Action, GameState, PromptStage, QuestDef } from "./types";

const ctx: Ctx = { content, t: makeTranslator("ru", "they") };
const profile = { name: "Саша", avatar: "a1" as const, pronoun: "they" as const, level: "practice" as const };

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

  it("любой ответ Диме открывает ТАКТ ИИ и задание Q2", () => {
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

  it("без данных ТАКТ ИИ выдумывает тыквенный латте — Анна не принимает", () => {
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

  it("неполное сохранение дополняется значениями по умолчанию", () => {
    const loaded = deserialize(JSON.stringify({ schemaVersion: 1, money: 1, xp: 0, profile: { pronoun: "x" }, messages: [], ledger: [], quests: {} }));
    expect(loaded).not.toBeNull();
    expect(loaded!.unread).toEqual([]);
    expect(loaded!.skills).toEqual({ aiComm: 0, aiLiteracy: 0 });
    expect(loaded!.profile).toEqual({ name: "Саша", avatar: "a1", pronoun: "they", level: "practice" });
    expect(loaded!.apps).toContain("school");
  });
});

describe("контент", () => {
  it("каждый ключ текста есть в русском словаре", () => {
    const keys = new Set<string>([content.finalGoalKey, "goal.school", "goal.rest", "ach.graduate"]);
    for (const m of content.school) {
      keys.add(m.titleKey).add(m.introKey).add(m.takeawayKey);
      if (m.kind === "quiz") for (const i of m.items) [i.qKey, i.explainKey, ...(i.optionKeys ?? m.optionKeys ?? [])].forEach((k) => keys.add(k));
      if (m.kind === "build") for (const r of m.rounds) [r.taskKey, r.resultKey, ...r.decoyKeys, ...r.parts.flatMap((p) => [p.labelKey, p.pieceKey, p.hintKey])].forEach((k) => keys.add(k));
      if (m.kind === "spot") for (const r of m.rounds) [r.factsKey, ...r.sentences.map((x) => x.key)].forEach((k) => keys.add(k));
    }
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
          for (const r of st.reactions ?? []) keys.add(r.textKey);
        }
      }
      if (q.kind === "classify") {
        keys.add(q.introKey).add(q.sourceTitleKey);
        for (const k of q.sourceKeys) keys.add(k);
        for (const o of q.options) keys.add(o.labelKey);
        for (const i of q.items) {
          keys.add(i.textKey);
          if (i.explainKey) keys.add(i.explainKey);
        }
        for (const m of q.onMissed ?? []) keys.add(m.textKey);
        if (q.shortcut) keys.add(q.shortcut.labelKey).add(q.shortcut.replyKey);
      }
      if (q.activeGoalKey) keys.add(q.activeGoalKey);
    }
    for (const l of content.lessons) {
      keys.add(l.titleKey).add(l.takeawayKey);
      for (const k of l.bodyKeys) keys.add(k);
      if (l.badKey) keys.add(l.badKey);
      if (l.goodKey) keys.add(l.goodKey);
    }
    for (const g of content.glossary) {
      keys.add(g.termKey).add(g.defKey);
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

describe("тексты и цели", () => {
  it("каждая форма {g:…} содержит ровно три варианта", () => {
    for (const [key, text] of Object.entries(ru)) {
      for (const m of text.matchAll(/\{g:([^}]*)\}/g)) expect(m[1]!.split("|"), key).toHaveLength(3);
    }
  });

  it("взятый заказ Сергея меняет цель с «возьми» на «напиши»", () => {
    const q5 = content.quests.find((q) => q.id === "q5")!;
    const state = newGameState(profile, ctx);
    state.quests.q5 = { status: "available", stage: 0, attempts: 0, bestQuality: 0, selections: {} };
    expect(currentGoal(state, { ...content, quests: [q5] }).textKey).toBe("q5.goal");
    state.quests.q5.status = "active";
    expect(currentGoal(state, { ...content, quests: [q5] }).textKey).toBe("q5.goalActive");
  });

  it("длина ответа считает эмодзи за один знак", () => {
    const st: PromptStage = { taskKey: "x", slots: [], cards: [], required: [], pass: 0, criteria: [], segments: [{ id: "e", variants: [{ textKey: "q3.seg.emoji" }] }] };
    expect(runPrompt(st, {}, ctx.t).length).toBe(8);
  });
});

/** Состояние, в котором все задания до `id` уже закрыты, а `id` взят в работу. */
function at(id: string, flags: string[] = []): GameState {
  const s = newGameState(profile, ctx);
  s.messages = [];
  s.quests = {};
  s.flags = [...flags];
  for (const q of content.quests) {
    if (q.id === id) break;
    s.quests[q.id] = { status: "done", stage: 0, attempts: 1, bestQuality: 1, selections: {} };
    for (const slot of q.reward.unlockSlots ?? []) if (!s.slots.includes(slot)) s.slots.push(slot);
  }
  refreshQuests(s, ctx);
  if (s.quests[id]?.status === "available") s.quests[id]!.status = "active";
  return s;
}

const factsRight = { year: "contra", founders: "source", hub: "source", staff: "missing", docs: "source", jobs: "source" };
const privacyRight = { name: "mask", phone: "remove", plate: "remove", car: "keep", date: "keep", debt: "remove" };

describe("Q6–Q13 — вторая половина акта", () => {
  it("Q6: без данных ТАКТ ИИ обещает обед на двоих — не принимается", () => {
    const { state, events } = play([{ type: "submitPrompt", questId: "q6", selection: { goal: "g.rev.reply", tone: "t.warm" } }], at("q6"));
    expect(state.quests.q6?.status).toBe("active");
    expect(events.find((e) => e.type === "promptResult")).toMatchObject({ result: { passed: false } });
  });

  it("Q6: кофе за счёт кафе — Анна пишет про четыре звезды", () => {
    const { state } = play([{ type: "submitPrompt", questId: "q6", selection: { goal: "g.rev.reply", tone: "t.warm", data: "d.rev.coffee" } }], at("q6"));
    expect(state.quests.q6?.status).toBe("done");
    expect(state.messages.some((m) => m.textKey === "q6.anna.coffee")).toBe(true);
    expect(state.relations.anna).toBe(1);
  });

  it("Q7: нужно отметить все утверждения", () => {
    const { events } = play([{ type: "submitClassify", questId: "q7", answers: { year: "contra" } }], at("q7"));
    expect(events[0]).toMatchObject({ type: "rejected", reasonKey: "err.classifyIncomplete" });
  });

  it("Q7: пропущенная выдумка про 2 000 сотрудников всплывает в сообщении Димы", () => {
    const { state, events } = play([{ type: "submitClassify", questId: "q7", answers: { ...factsRight, staff: "source" } }], at("q7"));
    expect(events.find((e) => e.type === "classifyResult")).toMatchObject({ passed: true, wrong: ["staff"] });
    expect(state.messages.some((m) => m.textKey === "q7.dima.staff")).toBe(true);
  });

  it("Q7: две пропущенные выдумки — не принято", () => {
    const { state } = play([{ type: "submitClassify", questId: "q7", answers: { ...factsRight, staff: "source", year: "source" } }], at("q7"));
    expect(state.quests.q7?.status).toBe("active");
  });

  it("Q10: короткий путь — заказ закрыт, но репутация падает, а «Аккуратный» не выдаётся", () => {
    const start = at("q10");
    start.rep = 5;
    const { state } = play([{ type: "takeShortcut", questId: "q10" }], start);
    expect(state.quests.q10?.status).toBe("done");
    expect(state.flags).toContain("leakedData");
    expect(state.flags).not.toContain("careful");
    expect(state.achievements).not.toContain("careful");
    expect(state.rep).toBe(3);
  });

  it("Q10: маскировка — флаг «аккуратный» и благодарность Сергея", () => {
    const { state } = play([{ type: "submitClassify", questId: "q10", answers: privacyRight }], at("q10"));
    expect(state.flags).toContain("careful");
    expect(state.messages.some((m) => m.textKey === "q10.sergey.clean")).toBe(true);
  });

  it("Q11: отказ «Волне» не открывает её заказ, согласие — открывает", () => {
    const refuse = play([{ type: "choose", questId: "q11", choiceId: "anna" }], at("q11")).state;
    expect(refuse.quests.q11v).toBeUndefined();
    expect(refuse.relations.anna).toBe(2);
    const take = play([{ type: "choose", questId: "q11", choiceId: "volna" }], at("q11")).state;
    expect(take.quests.q11v?.status).toBe("available");
    expect(take.flags).toContain("annaLate");
  });

  it("Q13: SMS с другими данными, чем в посте, не принимается", () => {
    const { state } = play(
      [
        { type: "submitPrompt", questId: "q13", selection: { format: "f.post", data: "d.camp.oct", tone: "t.playful" } },
        { type: "submitPrompt", questId: "q13", selection: { format: "f.sms", data: "d.camp.old", tone: "t.playful" } },
      ],
      at("q13"),
    );
    expect(state.quests.q13?.stage).toBe(1);
  });

  it("Q13: опоздание из-за «Волны» уменьшает оплату кампании", () => {
    const camp: Action[] = [
      { type: "submitPrompt", questId: "q13", selection: { format: "f.post", data: "d.camp.oct", tone: "t.playful" } },
      { type: "submitPrompt", questId: "q13", selection: { format: "f.sms", data: "d.camp.oct", tone: "t.playful" } },
      { type: "submitPrompt", questId: "q13", selection: { format: "f.sign", data: "d.camp.oct", tone: "t.playful" } },
    ];
    const onTime = play(camp, at("q13")).state;
    const late = play(camp, at("q13", ["annaLate"])).state;
    expect(onTime.quests.q13?.status).toBe("done");
    expect(late.money).toBeLessThan(onTime.money);
    expect(onTime.toasts.some((t) => t.kind === "milestone")).toBe(true);
  });

  it("сохранение, сделанное до выхода Q6, после загрузки получает новое задание", () => {
    const s = at("q6");
    const id = "q6" as string;
    delete s.quests[id];
    s.messages = [];
    refreshQuests(s, ctx);
    expect(s.quests[id]?.status).toBe("available");
    expect(s.messages.some((m) => m.textKey === "q6.offer")).toBe(true);
  });

  it("уроки привязаны к существующим заданиям, урок отмечается прочитанным один раз", () => {
    for (const l of content.lessons) expect(content.quests.some((q) => q.id === l.questId), l.id).toBe(true);
    const { state } = play([{ type: "seeLesson", lessonId: "prompt" }, { type: "seeLesson", lessonId: "prompt" }]);
    expect(state.lessons).toEqual(["prompt"]);
  });

  it("старое сохранение версии 1 получает флаги и отношения", () => {
    const s = newGameState(profile, ctx) as unknown as Record<string, unknown>;
    delete s.flags;
    delete s.relations;
    delete s.lessons;
    s.schemaVersion = 1;
    const loaded = deserialize(JSON.stringify(s));
    expect(loaded?.flags).toEqual([]);
    expect(loaded?.relations).toEqual({});
    expect(loaded?.lessons).toEqual([]);
  });
});

describe("Этап 2 — покупки, подработки, таймер", () => {
  const allStoryDone = (): GameState => {
    const s = newGameState(profile, ctx);
    s.messages = [];
    s.quests = {};
    for (const q of content.quests) {
      if (q.repeatable) continue;
      s.quests[q.id] = { status: "done", stage: 0, attempts: 1, bestQuality: 1, selections: {} };
      for (const slot of q.reward.unlockSlots ?? []) if (!s.slots.includes(slot)) s.slots.push(slot);
    }
    refreshQuests(s, ctx);
    return s;
  };
  const spotRight = { day: "true", len: "fake", cars: "true", years: "fake", mayor: "fake", cost: "true" };

  it("«ТАКТ Плюс» включает проверку до отправки и закрывает заказ на покупку", () => {
    const s = at("q12p", ["wantPlus"]);
    s.money = 1000;
    const { state } = play([{ type: "buy", itemId: "neiraPlus" }], s);
    expect(state.flags).toContain("selfCheck");
    expect(state.quests.q12p?.status).toBe("done");
    expect(state.money).toBe(700);
  });

  it("ноутбук нельзя купить, пока Алекс о нём не рассказал", () => {
    const s = at("q12");
    s.money = 5000;
    const { state, events } = play([{ type: "buy", itemId: "laptopLight" }], s);
    expect(state.inventory).not.toContain("laptopLight");
    expect(events.some((e) => e.type === "rejected")).toBe(true);
  });

  it("покупка одного из двух ноутбуков завершает второй этап", () => {
    const s = at("q15b");
    s.money = 5000;
    const { state } = play([{ type: "buy", itemId: "laptopGamer" }], s);
    expect(state.quests.q15b?.status).toBe("done");
    expect(state.flags).toContain("gpuLaptop");
  });

  it("подработка после сдачи снова доступна и платит повторно", () => {
    let s = allStoryDone();
    expect(s.quests.gigSpot?.status).toBe("available");
    expect(currentGoal(s, content).textKey).toBe("goal.gigs");
    const before = s.money;
    const run = (): Action[] => [
      { type: "acceptQuest", questId: "gigSpot" },
      { type: "submitClassify", questId: "gigSpot", answers: spotRight },
    ];
    s = play(run(), s).state;
    const once = s.money - before;
    expect(once).toBeGreaterThan(0);
    // Сданная подработка уходит с доски до завтра
    expect(s.quests.gigSpot).toMatchObject({ status: "done", runs: 1 });
    expect(play(run(), s).events[0]).toMatchObject({ type: "rejected" });
    s = play([{ type: "sleep" }], s).state;
    expect(s.quests.gigSpot?.status).toBe("available");
    s = play(run(), s).state;
    expect(s.money - before).toBe(once * 2);
    expect(s.quests.gigSpot?.runs).toBe(2);
  });

  it("на время: неотвеченный пункт считается ошибкой, а не блокирует сдачу", () => {
    const s = allStoryDone();
    const answers: Record<string, string> = { ...spotRight };
    delete answers.day;
    const { state } = play([{ type: "acceptQuest", questId: "gigSpot" }, { type: "submitClassify", questId: "gigSpot", answers }], s);
    expect(state.quests.gigSpot?.runs).toBe(1);
  });
});

describe("уровни и Школа ТАКТ ИИ", () => {
  const start = (level: "novice" | "practice" | "pro") => play([{ type: "newGame", profile: { ...profile, level } }]).state;

  it("новичка цель ведёт в школу, пока не пройдены азы", () => {
    let s = start("novice");
    expect(currentGoal(s, content).school).toBe(true);
    // Пока азы не пройдены, сюжет не начинается: ни сообщений, ни заданий.
    expect(s.messages).toHaveLength(0);
    for (const m of content.school.filter((x) => x.core)) s = play([{ type: "finishSchool", moduleId: m.id, correct: 1, total: 2 }], s).state;
    expect(currentGoal(s, content).school).toBeUndefined();
    expect(s.messages.length).toBeGreaterThan(0);
    expect(currentGoal(start("practice"), content).school).toBeUndefined();
  });

  it("урок школы платит один раз, а вся школа даёт достижение", () => {
    let s = start("practice");
    const money = s.money;
    s = play([{ type: "finishSchool", moduleId: "ai", correct: 8, total: 8 }], s).state;
    s = play([{ type: "finishSchool", moduleId: "ai", correct: 8, total: 8 }], s).state;
    expect(s.money - money).toBe(15);
    for (const m of content.school) s = play([{ type: "finishSchool", moduleId: m.id, correct: 1, total: 1 }], s).state;
    expect(s.achievements).toContain("graduate");
    expect(play([{ type: "finishSchool", moduleId: "nope", correct: 1, total: 1 }], s).events[0]).toMatchObject({ type: "rejected" });
  });

  it("профи сдаёт задания по более строгому порогу", () => {
    expect(passFor(start("pro"), 0.7)).toBeCloseTo(0.8);
    expect(passFor(start("pro"), 0.9)).toBe(0.95);
    expect(passFor(start("novice"), 0.7)).toBe(0.7);
  });

  it("старое сохранение: уже сданные подработки уходят с доски до завтра", () => {
    const s = newGameState(profile, ctx);
    s.quests.gigSms = { status: "available", stage: 0, attempts: 0, bestQuality: 1, selections: {}, runs: 1 };
    s.quests.gigReview = { status: "available", stage: 0, attempts: 0, bestQuality: 0, selections: {} };
    const loaded = deserialize(JSON.stringify({ ...s, schemaVersion: 3 }))!;
    expect(loaded.quests.gigSms).toMatchObject({ status: "done", readyDay: s.day + 1 });
    expect(loaded.quests.gigReview?.status).toBe("available");
    // Новое сохранение повторно не прячет подработку, вернувшуюся утром
    expect(deserialize(serialize({ ...s }))!.quests.gigSms?.status).toBe("available");
  });

});
