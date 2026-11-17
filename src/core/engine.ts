// Игровое ядро: apply(state, action) → новое состояние + события.
// Чистые функции, без React и без браузера — их же можно запускать на сервере.

import { orderPay, skillLevel } from "./economy";
import { matches, runPrompt, type Translate } from "./promptSim";
import type {
  Action,
  Content,
  GameEvent,
  GameState,
  Level,
  NpcId,
  QuestDef,
  SkillId,
  TextKey,
} from "./types";

export const SCHEMA_VERSION = 5;
export const START_MONEY = 40;
export const DAY_START_HOUR = 19;
export const SCHOOL_PAY = 15;
export const SCHOOL_XP = 10;

/** Уровень игрока; старые сохранения без уровня считаются «практиком». */
export const levelOf = (state: GameState): Level => state.profile.level ?? "practice";
/** Профи сдаёт задания по более строгому порогу. */
export const passFor = (state: GameState, pass: number) => (levelOf(state) === "pro" ? Math.min(0.95, pass + 0.1) : pass);
export const needsSchool = (state: GameState, content: Content) =>
  levelOf(state) === "novice" && !content.school.filter((m) => m.core).every((m) => state.flags.includes(`school:${m.id}`));
export const schoolDone = (state: GameState, content: Content) => content.school.every((m) => state.flags.includes(`school:${m.id}`));

export interface Ctx {
  content: Content;
  t: Translate;
}

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

export function newGameState(profile: GameState["profile"], ctx: Ctx): GameState {
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    profile,
    money: START_MONEY,
    xp: 0,
    rep: 0,
    day: 1,
    hour: DAY_START_HOUR,
    skills: { aiComm: 0, aiLiteracy: 0 },
    inventory: [],
    apps: ["school"],
    slots: ["goal", "recipient", "tone"],
    quests: {},
    messages: [],
    unread: [],
    ledger: [],
    achievements: [],
    flags: [],
    relations: {},
    lessons: [],
    toasts: [],
    nextMessageId: 1,
  };
  refreshQuests(state, ctx);
  return state;
}

export function apply(prev: GameState, action: Action, ctx: Ctx): ApplyResult {
  if (action.type === "newGame") return { state: newGameState(action.profile, ctx), events: [] };

  const state = structuredClone(prev);
  const events: GameEvent[] = [];
  const reject = (reasonKey: TextKey): ApplyResult => ({ state: prev, events: [{ type: "rejected", reasonKey }] });

  switch (action.type) {
    case "clearToasts":
      state.toasts = [];
      return { state, events };

    case "seeLesson":
      if (!ctx.content.lessons.some((l) => l.id === action.lessonId)) return reject("err.questUnavailable");
      if (!state.lessons.includes(action.lessonId)) state.lessons.push(action.lessonId);
      return { state, events };

    case "finishSchool": {
      const mod = ctx.content.school.find((m) => m.id === action.moduleId);
      if (!mod || action.total <= 0 || action.correct < 0 || action.correct > action.total) return reject("err.questUnavailable");
      const flag = `school:${mod.id}`;
      if (state.flags.includes(flag)) return { state, events };
      addFlag(state, flag);
      // Награда за первый проход: немного денег, опыт и грамотность в ИИ.
      if (addLedger(state, flag, SCHOOL_PAY, mod.titleKey)) state.toasts.push({ kind: "money", amount: SCHOOL_PAY });
      state.xp += SCHOOL_XP;
      state.toasts.push({ kind: "xp", amount: SCHOOL_XP });
      const def = ctx.content.skills.find((x) => x.id === "aiLiteracy");
      const before = def ? skillLevel(state.skills.aiLiteracy, def.levels) : 0;
      state.skills.aiLiteracy += 1;
      const after = def ? skillLevel(state.skills.aiLiteracy, def.levels) : 0;
      if (after > before) state.toasts.push({ kind: "skill", skill: "aiLiteracy", level: after });
      refreshQuests(state, ctx);
      if (schoolDone(state, ctx.content) && !state.achievements.includes("graduate")) {
        state.achievements.push("graduate");
        state.toasts.push({ kind: "achievement", id: "graduate" });
      }
      return { state, events };
    }

    case "readChat":
      state.unread = state.unread.filter((n) => n !== action.npc);
      return { state, events };

    case "choose": {
      const quest = findQuest(ctx, action.questId);
      const progress = state.quests[action.questId];
      if (!quest || quest.kind !== "dialog" || !progress || progress.status === "done") return reject("err.questUnavailable");
      const choice = quest.choices.find((c) => c.id === action.choiceId);
      if (!choice) return reject("err.questUnavailable");
      progress.choice = choice.id;
      for (const f of choice.effects?.flags ?? []) addFlag(state, f);
      for (const [npc, d] of Object.entries(choice.effects?.rel ?? {}) as [NpcId, number][]) changeRel(state, npc, d);
      if (choice.effects?.rep) state.rep = Math.max(0, state.rep + choice.effects.rep);
      for (const m of state.messages) if (m.choices?.questId === quest.id) delete m.choices;
      postMessage(state, quest.npc, "player", choice.textKey);
      postMessage(state, quest.npc, "npc", choice.replyKey);
      completeQuest(state, quest, 1, ctx, events);
      return { state, events };
    }

    case "acceptQuest": {
      const progress = state.quests[action.questId];
      if (!progress || progress.status !== "available") return reject("err.questUnavailable");
      progress.status = "active";
      for (const m of state.messages) if (m.offerQuest === action.questId) delete m.offerQuest;
      return { state, events };
    }

    case "submitPrompt": {
      const quest = findQuest(ctx, action.questId);
      const progress = state.quests[action.questId];
      if (!quest || quest.kind !== "prompt" || !progress || progress.status !== "active") return reject("err.questUnavailable");
      const stage = quest.stages[progress.stage];
      if (!stage) return reject("err.questUnavailable");

      for (const [slot, cardId] of Object.entries(action.selection)) {
        if (!cardId) continue; // снятая карточка — пустой слот, а не ошибка
        const card = ctx.content.cards.find((c) => c.id === cardId);
        if (!card || card.slot !== slot || !stage.cards.includes(card.id) || !state.slots.includes(card.slot) || !stage.slots.includes(card.slot)) {
          return reject("err.badCard");
        }
      }
      for (const slot of stage.required) if (!action.selection[slot]) return reject("err.missingSlot");

      const stageIndex = progress.stage;
      const result = runPrompt({ ...stage, pass: passFor(state, stage.pass) }, action.selection, ctx.t, progress.selections);
      progress.attempts += 1;
      progress.selections[progress.stage] = { ...action.selection };
      advanceClock(state, 1);

      const isLast = progress.stage === quest.stages.length - 1;
      let pay = 0;
      if (result.passed && !isLast) {
        progress.stage += 1;
        if (stage.afterPass) postMessage(state, stage.afterPass.from, "npc", stage.afterPass.textKey);
      } else if (result.passed && isLast) {
        progress.bestQuality = Math.max(progress.bestQuality, result.quality);
        pay = completeQuest(state, quest, result.quality, ctx, events);
      }
      // Первый принятый промпт, написанный своими словами, — отдельное достижение и бонус к навыку.
      if (result.passed && action.freeform && !state.achievements.includes("ownWords")) {
        state.achievements.push("ownWords");
        state.toasts.push({ kind: "achievement", id: "ownWords" });
        state.skills.aiComm += 1;
      }
      events.unshift({
        type: "promptResult",
        questId: quest.id,
        stage: stageIndex,
        result,
        pay,
        finished: result.passed && isLast,
      });
      return { state, events };
    }

    case "submitClassify": {
      const quest = findQuest(ctx, action.questId);
      const progress = state.quests[action.questId];
      if (!quest || quest.kind !== "classify" || !progress || progress.status !== "active") return reject("err.questUnavailable");
      const optionIds = quest.options.map((o) => o.id);
      if (!quest.timer) for (const item of quest.items) if (!optionIds.includes(action.answers[item.id] ?? "")) return reject("err.classifyIncomplete");
      const total = quest.items.reduce((n, i) => n + i.weight, 0) || 1;
      const wrong = quest.items.filter((i) => action.answers[i.id] !== i.answer).map((i) => i.id);
      const lost = quest.items.filter((i) => wrong.includes(i.id)).reduce((n, i) => n + i.weight, 0);
      const quality = Math.round((1 - lost / total) * 100) / 100;
      const passed = quality >= passFor(state, quest.pass);
      progress.attempts += 1;
      progress.bestQuality = Math.max(progress.bestQuality, quality);
      advanceClock(state, 1);
      let pay = 0;
      if (passed) {
        pay = completeQuest(state, quest, quality, ctx, events);
        for (const m of quest.onMissed ?? []) if (wrong.includes(m.itemId)) postMessage(state, m.from, "npc", m.textKey);
      }
      events.unshift({ type: "classifyResult", questId: quest.id, quality, passed, wrong, pay });
      return { state, events };
    }

    case "takeShortcut": {
      const quest = findQuest(ctx, action.questId);
      const progress = state.quests[action.questId];
      if (!quest || quest.kind !== "classify" || !quest.shortcut || !progress || progress.status !== "active") return reject("err.questUnavailable");
      for (const f of quest.shortcut.flags) addFlag(state, f);
      state.rep = Math.max(0, state.rep + quest.shortcut.rep);
      progress.attempts += 1;
      if (quest.client) postMessage(state, quest.client, "npc", quest.shortcut.replyKey);
      const pay = completeQuest(state, quest, 0.75, ctx, events, true);
      events.unshift({ type: "classifyResult", questId: quest.id, quality: 0.75, passed: true, wrong: [], pay });
      return { state, events };
    }

    case "collectIncome": {
      collectIncome(state, ctx, action.now);
      return { state, events };
    }

    case "buy": {
      const item = ctx.content.items.find((i) => i.id === action.itemId);
      if (!item || (item.requiresQuest && !state.quests[item.requiresQuest])) return reject("err.noItem");
      if (state.inventory.includes(item.id)) return reject("err.owned");
      if (item.requiresItem && !state.inventory.includes(item.requiresItem)) return reject("err.noItem");
      if (state.money < item.price) return reject("err.noMoney");
      // Перед покупкой нового источника дохода забираем накопленное по старой ставке.
      if (item.incomePerHour && action.now) collectIncome(state, ctx, action.now);
      if (!addLedger(state, `buy:${item.id}`, -item.price, item.nameKey)) return reject("err.owned");
      state.inventory.push(item.id);
      for (const f of item.flags ?? []) addFlag(state, f);
      for (const slot of item.unlockSlots ?? []) if (!state.slots.includes(slot)) state.slots.push(slot);
      if (item.rep) state.rep += item.rep;
      if (item.incomePerHour && state.incomeAt === undefined) state.incomeAt = action.now ?? Date.now();
      if (item.achievement && !state.achievements.includes(item.achievement)) {
        state.achievements.push(item.achievement);
        state.toasts.push({ kind: "achievement", id: item.achievement });
      }
      events.push({ type: "bought", itemId: item.id });
      for (const q of ctx.content.quests) {
        if (q.kind === "purchase" && state.quests[q.id]?.status === "active" && (!q.items || q.items.includes(item.id))) completeQuest(state, q, 1, ctx, events);
      }
      return { state, events };
    }
  }
}

// ---------- Покупки: бонусы и пассивный доход ----------

const owned = (state: GameState, ctx: Ctx) => ctx.content.items.filter((i) => state.inventory.includes(i.id));
export const itemPayBoost = (state: GameState, ctx: Ctx) => owned(state, ctx).reduce((n, i) => n + (i.payBoost ?? 0), 0);
export const itemXpBoost = (state: GameState, ctx: Ctx) => owned(state, ctx).reduce((n, i) => n + (i.xpBoost ?? 0), 0);
export const incomeRate = (state: GameState, ctx: Ctx) => owned(state, ctx).reduce((n, i) => n + (i.incomePerHour ?? 0), 0);
export const INCOME_CAP_HOURS = 12;

/** Сколько накопилось пассивного дохода к моменту now (не больше чем за 12 часов). */
export function pendingIncome(state: GameState, ctx: Ctx, now: number): number {
  const rate = incomeRate(state, ctx);
  if (!rate || state.incomeAt === undefined) return 0;
  const hours = Math.min(INCOME_CAP_HOURS, Math.max(0, now - state.incomeAt) / 3_600_000);
  return Math.floor(rate * hours);
}

function collectIncome(state: GameState, ctx: Ctx, now: number): number {
  const amount = pendingIncome(state, ctx, now);
  if (state.incomeAt === undefined || amount > 0) state.incomeAt = now;
  if (amount > 0 && addLedger(state, `income:${now}`, amount, "ui.shop.incomeLedger")) {
    state.toasts.push({ kind: "money", amount });
    return amount;
  }
  return 0;
}

// ---------- Внутренние помощники ----------

function findQuest(ctx: Ctx, id: string): QuestDef | undefined {
  return ctx.content.quests.find((q) => q.id === id);
}

function postMessage(state: GameState, npc: NpcId, from: "npc" | "player", textKey: TextKey, extra: Partial<GameState["messages"][number]> = {}) {
  state.messages.push({ id: state.nextMessageId++, npc, from, textKey, ...extra });
  if (from === "npc" && !state.unread.includes(npc)) state.unread.push(npc);
}

/** Добавляет запись в журнал выплат. Повторный ключ игнорируется — защита от двойных наград. */
function addLedger(state: GameState, key: string, delta: number, reasonKey: TextKey): boolean {
  if (state.ledger.some((e) => e.key === key)) return false;
  state.ledger.push({ key, delta, reasonKey, day: state.day });
  state.money += delta;
  return true;
}

function addFlag(state: GameState, flag: string) {
  if (!state.flags.includes(flag)) state.flags.push(flag);
}

function changeRel(state: GameState, npc: NpcId, delta: number) {
  state.relations[npc] = Math.max(-5, Math.min(5, (state.relations[npc] ?? 0) + delta));
}

function advanceClock(state: GameState, hours: number) {
  state.hour += hours;
  while (state.hour >= 24) {
    state.hour -= 24 - 9; // ночь пропускается, утро в 9:00
    state.day += 1;
  }
}

/** Выполненные подработки: каждая сдаётся один раз и остаётся в списке «Выполнено». */
export function doneGigs(state: GameState, content: Content): QuestDef[] {
  return content.quests.filter((q) => q.repeatable && state.quests[q.id]?.status === "done");
}

/** shortcut: задание закрыто коротким путём — без бонусов за аккуратность (флаги, репутация, навыки, достижения). */
function completeQuest(state: GameState, quest: QuestDef, quality: number, ctx: Ctx, events: GameEvent[], shortcut = false): number {
  const progress = state.quests[quest.id];
  if (!progress || progress.status === "done") return 0;
  progress.status = "done";
  const r = quest.reward;

  let pay = 0;
  if (!shortcut) for (const f of r.flags ?? []) addFlag(state, f);
  for (const [npc, d] of Object.entries(r.rel ?? {}) as [NpcId, number][]) changeRel(state, npc, d);
  if (r.pay) {
    const flagMul = Object.entries(r.payByFlag ?? {}).reduce((m, [f, k]) => (state.flags.includes(f) ? m * k : m), 1);
    const levelMul = levelOf(state) === "pro" ? 1.25 : 1;
    const itemMul = 1 + itemPayBoost(state, ctx);
    pay = orderPay({ stage: quest.stage, complexity: r.pay.complexity * flagMul * levelMul * itemMul, client: r.pay.client, quality, rep: state.rep, attempts: progress.attempts });
    const ledgerKey = quest.repeatable ? `quest:${quest.id}:${(progress.runs ?? 0) + 1}` : `quest:${quest.id}`;
    if (pay > 0 && addLedger(state, ledgerKey, pay, quest.titleKey)) state.toasts.push({ kind: "money", amount: pay });
    else pay = 0;
  }
  if (r.xp) {
    const xp = Math.round(r.xp * (1 + itemXpBoost(state, ctx)));
    state.xp += xp;
    state.toasts.push({ kind: "xp", amount: xp });
  }
  if (r.rep && !shortcut) state.rep += quality >= 0.9 ? r.rep : Math.ceil(r.rep / 3);
  for (const [skill, uses] of Object.entries(shortcut ? {} : (r.skills ?? {})) as [SkillId, number][]) {
    const def = ctx.content.skills.find((s) => s.id === skill);
    const before = def ? skillLevel(state.skills[skill], def.levels) : 0;
    state.skills[skill] += uses;
    const after = def ? skillLevel(state.skills[skill], def.levels) : 0;
    if (after > before) state.toasts.push({ kind: "skill", skill, level: after });
  }
  for (const a of shortcut ? [] : (r.achievements ?? [])) {
    if (!state.achievements.includes(a)) {
      state.achievements.push(a);
      state.toasts.push({ kind: "achievement", id: a });
    }
  }
  for (const app of r.unlockApps ?? []) {
    if (!state.apps.includes(app)) {
      state.apps.push(app);
      state.toasts.push({ kind: "unlock", app });
    }
  }
  for (const slot of r.unlockSlots ?? []) if (!state.slots.includes(slot)) state.slots.push(slot);
  if (r.milestoneKey) state.toasts.push({ kind: "milestone", textKey: r.milestoneKey });

  const lastSel = Object.values(progress.selections).at(-1) ?? {};
  for (const m of quest.onComplete ?? []) {
    if (m.minQuality !== undefined && quality < m.minQuality) continue;
    if (m.maxQuality !== undefined && quality >= m.maxQuality) continue;
    if (m.whenSel && !matches(m.whenSel, lastSel)) continue;
    if (m.flag && !state.flags.includes(m.flag)) continue;
    if (m.noFlag && state.flags.includes(m.noFlag)) continue;
    postMessage(state, m.from, "npc", m.textKey, { vars: { pay } });
  }

  events.push({ type: "questDone", questId: quest.id });
  // Подработка сдаётся один раз и уходит с доски в «Выполнено».
  if (quest.repeatable) progress.runs = (progress.runs ?? 0) + 1;
  refreshQuests(state, ctx);
  return pay;
}

/** Открывает задания, у которых выполнены все предпосылки. */
export function refreshQuests(state: GameState, ctx: Ctx) {
  // Новичок сначала проходит азы в школе, а потом приходят первые сообщения и задания.
  if (needsSchool(state, ctx.content)) return;
  for (const quest of ctx.content.quests) {
    if (state.quests[quest.id]) continue;
    const ready = quest.requires.every((id) => state.quests[id]?.status === "done");
    if (!ready) continue;
    if (quest.requiresFlag && !state.flags.includes(quest.requiresFlag)) continue;
    if (quest.requiresNoFlag && state.flags.includes(quest.requiresNoFlag)) continue;
    const auto = quest.offer.type === "auto" || quest.kind === "dialog";
    state.quests[quest.id] = { status: auto ? "active" : "available", stage: 0, attempts: 0, bestQuality: 0, selections: {} };
    if (quest.kind === "dialog") {
      postMessage(state, quest.npc, "npc", quest.promptKey, { choices: { questId: quest.id, options: quest.choices } });
    } else if (quest.offer.type === "message") {
      postMessage(state, quest.offer.from, "npc", quest.offer.textKey, { offerQuest: quest.id });
    }
  }
}

export function currentGoal(state: GameState, content: Content): { textKey: TextKey; questId?: string; school?: boolean } {
  // Новичок начинает со Школы ТАКТ ИИ: пока не пройдены азы, цель ведёт туда.
  if (needsSchool(state, content)) {
    return { textKey: "goal.school", school: true };
  }
  const story = content.quests.filter((q) => !q.repeatable);
  const active = story.find((q) => state.quests[q.id]?.status === "active") ?? content.quests.find((q) => state.quests[q.id]?.status === "active");
  if (active) return { textKey: active.activeGoalKey ?? active.goalKey, questId: active.id };
  const available = story.find((q) => state.quests[q.id]?.status === "available");
  if (available) return { textKey: available.goalKey, questId: available.id };
  const gig = content.quests.find((q) => q.repeatable && state.quests[q.id]?.status === "available");
  if (gig) return { textKey: "goal.gigs", questId: gig.id };
  return { textKey: content.finalGoalKey };
}

export function boardQuests(state: GameState, content: Content): QuestDef[] {
  return content.quests.filter(
    (q) => q.offer.type === "board" && state.quests[q.id] && state.quests[q.id]!.status !== "done",
  );
}
