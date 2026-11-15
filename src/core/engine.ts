// Игровое ядро: apply(state, action) → новое состояние + события.
// Чистые функции, без React и без браузера — их же можно запускать на сервере.

import { orderPay, skillLevel } from "./economy";
import { runPrompt, type Translate } from "./promptSim";
import type {
  Action,
  Content,
  GameEvent,
  GameState,
  NpcId,
  QuestDef,
  SkillId,
  TextKey,
} from "./types";

export const SCHEMA_VERSION = 1;
export const START_MONEY = 40;
export const DAY_START_HOUR = 19;

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
    apps: [],
    slots: ["goal", "recipient", "tone"],
    quests: {},
    messages: [],
    unread: [],
    ledger: [],
    achievements: [],
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
        const card = ctx.content.cards.find((c) => c.id === cardId);
        if (!card || card.slot !== slot || !stage.cards.includes(card.id) || !state.slots.includes(card.slot) || !stage.slots.includes(card.slot)) {
          return reject("err.badCard");
        }
      }
      for (const slot of stage.required) if (!action.selection[slot]) return reject("err.missingSlot");

      const stageIndex = progress.stage;
      const result = runPrompt(stage, action.selection, ctx.t, progress.selections);
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

    case "buy": {
      const item = ctx.content.items.find((i) => i.id === action.itemId);
      if (!item) return reject("err.noItem");
      if (state.inventory.includes(item.id)) return reject("err.owned");
      if (state.money < item.price) return reject("err.noMoney");
      if (!addLedger(state, `buy:${item.id}`, -item.price, item.nameKey)) return reject("err.owned");
      state.inventory.push(item.id);
      for (const slot of item.unlockSlots ?? []) if (!state.slots.includes(slot)) state.slots.push(slot);
      events.push({ type: "bought", itemId: item.id });
      for (const q of ctx.content.quests) {
        if (q.kind === "purchase" && state.quests[q.id]?.status === "active") completeQuest(state, q, 1, ctx, events);
      }
      return { state, events };
    }
  }
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

function advanceClock(state: GameState, hours: number) {
  state.hour += hours;
  while (state.hour >= 24) {
    state.hour -= 24 - 9; // ночь пропускается, утро в 9:00
    state.day += 1;
  }
}

function completeQuest(state: GameState, quest: QuestDef, quality: number, ctx: Ctx, events: GameEvent[]): number {
  const progress = state.quests[quest.id];
  if (!progress || progress.status === "done") return 0;
  progress.status = "done";
  const r = quest.reward;

  let pay = 0;
  if (r.pay) {
    pay = orderPay({ stage: quest.stage, complexity: r.pay.complexity, client: r.pay.client, quality, rep: state.rep, attempts: progress.attempts });
    if (pay > 0 && addLedger(state, `quest:${quest.id}`, pay, quest.titleKey)) state.toasts.push({ kind: "money", amount: pay });
    else pay = 0;
  }
  if (r.xp) {
    state.xp += r.xp;
    state.toasts.push({ kind: "xp", amount: r.xp });
  }
  if (r.rep) state.rep += quality >= 0.9 ? r.rep : Math.ceil(r.rep / 3);
  for (const [skill, uses] of Object.entries(r.skills ?? {}) as [SkillId, number][]) {
    const def = ctx.content.skills.find((s) => s.id === skill);
    const before = def ? skillLevel(state.skills[skill], def.levels) : 0;
    state.skills[skill] += uses;
    const after = def ? skillLevel(state.skills[skill], def.levels) : 0;
    if (after > before) state.toasts.push({ kind: "skill", skill, level: after });
  }
  for (const a of r.achievements ?? []) {
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

  for (const m of quest.onComplete ?? []) {
    if (m.minQuality !== undefined && quality < m.minQuality) continue;
    if (m.maxQuality !== undefined && quality >= m.maxQuality) continue;
    postMessage(state, m.from, "npc", m.textKey, { vars: { pay } });
  }

  events.push({ type: "questDone", questId: quest.id });
  refreshQuests(state, ctx);
  return pay;
}

/** Открывает задания, у которых выполнены все предпосылки. */
export function refreshQuests(state: GameState, ctx: Ctx) {
  for (const quest of ctx.content.quests) {
    if (state.quests[quest.id]) continue;
    const ready = quest.requires.every((id) => state.quests[id]?.status === "done");
    if (!ready) continue;
    const auto = quest.offer.type === "auto" || quest.kind === "dialog";
    state.quests[quest.id] = { status: auto ? "active" : "available", stage: 0, attempts: 0, bestQuality: 0, selections: {} };
    if (quest.kind === "dialog") {
      postMessage(state, quest.npc, "npc", quest.promptKey, { choices: { questId: quest.id, options: quest.choices } });
    } else if (quest.offer.type === "message") {
      postMessage(state, quest.offer.from, "npc", quest.offer.textKey, { offerQuest: quest.id });
    }
  }
}

export function currentGoal(state: GameState, content: Content): { textKey: TextKey; questId?: string } {
  const order = content.quests;
  const active = order.find((q) => state.quests[q.id]?.status === "active");
  if (active) return { textKey: active.activeGoalKey ?? active.goalKey, questId: active.id };
  const available = order.find((q) => state.quests[q.id]?.status === "available");
  if (available) return { textKey: available.goalKey, questId: available.id };
  return { textKey: content.finalGoalKey };
}

export function boardQuests(state: GameState, content: Content): QuestDef[] {
  return content.quests.filter(
    (q) => q.offer.type === "board" && state.quests[q.id] && state.quests[q.id]!.status !== "done",
  );
}
